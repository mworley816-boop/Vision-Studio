-- Phase 22 draft: review and apply ONLY to a new, dedicated Vision Studio project.
-- Run phase9-schema.sql and phase11-sync.sql first. NOT applied automatically.
-- All privileged functions are in non-exposed schema; callable only with server-side service_role.
create schema if not exists studio_internal;
revoke all on schema studio_internal from public, anon, authenticated;
grant usage on schema studio_internal to service_role;

create table if not exists public.studio_paid_jobs (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.studio_productions(id) on delete restrict,
  owner_id uuid not null references public.studio_owners(user_id),
  idempotency_key text not null check (length(idempotency_key) between 8 and 180),
  provider text not null check (length(provider) between 1 and 100),
  max_charge_cents integer not null check (max_charge_cents between 0 and 2000),
  actual_charge_cents integer check (actual_charge_cents between 0 and 2000),
  status text not null default 'queued' check (status in ('queued','running','needs_reconciliation','completed','failed')),
  worker_id text,
  lease_expires_at timestamptz,
  attempts integer not null default 0 check (attempts between 0 and 10),
  provider_request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (production_id,idempotency_key),
  unique (provider,provider_request_id),
  foreign key (production_id,owner_id) references public.studio_productions(id,owner_id)
);
create index if not exists studio_paid_jobs_queue_idx on public.studio_paid_jobs(status,created_at);
create index if not exists studio_paid_jobs_production_idx on public.studio_paid_jobs(production_id);
alter table public.studio_paid_jobs enable row level security;
revoke all on public.studio_paid_jobs from public, anon, authenticated;
-- Owner can inspect their own queue state but cannot mutate reservations.
grant select on public.studio_paid_jobs to authenticated;
create policy "owner reads own paid jobs" on public.studio_paid_jobs for select to authenticated
 using (owner_id = (select auth.uid()) and exists(select 1 from public.studio_owners o where o.user_id = (select auth.uid())));

create or replace function studio_internal.reserve_job(
  p_production_id uuid, p_key text, p_provider text, p_max_cents integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_budget integer; v_used bigint; v_id uuid;
begin
  if p_key is null or length(p_key) not between 8 and 180 or p_provider is null or length(p_provider) not between 1 and 100 or p_max_cents is null or p_max_cents < 0 then
    raise exception 'Invalid reservation';
  end if;
  -- Serialize every reservation for a production using the parent row lock.
  select owner_id,budget_cents into v_owner,v_budget from public.studio_productions
    where id=p_production_id for update;
  if not found then raise exception 'Production not found'; end if;
  -- Never increase a reservation by replaying the same idempotency key.
  select id into v_id from public.studio_paid_jobs where production_id=p_production_id and idempotency_key=p_key;
  if found then
    if not exists (select 1 from public.studio_paid_jobs where id=v_id and provider=p_provider and max_charge_cents=p_max_cents) then
      raise exception 'Idempotency key reused with different parameters';
    end if;
    return v_id;
  end if;
  -- Unreconciled jobs retain full reservations; settled jobs count actual charges.
  select coalesce(sum(case when status in ('completed','failed') then actual_charge_cents else max_charge_cents end),0)
    into v_used from public.studio_paid_jobs where production_id=p_production_id;
  if v_used+p_max_cents>v_budget then raise exception 'Production spending cap exceeded'; end if;
  insert into public.studio_paid_jobs(production_id,owner_id,idempotency_key,provider,max_charge_cents)
    values(p_production_id,v_owner,p_key,p_provider,p_max_cents) returning id into v_id;
  return v_id;
end $$;

create or replace function studio_internal.claim_job(p_worker text,p_lease_seconds integer default 120)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_worker is null or length(p_worker) not between 8 and 120 or p_lease_seconds not between 30 and 600 then raise exception 'Invalid worker lease'; end if;
  select id into v_id from public.studio_paid_jobs where status='queued' order by created_at,id
    for update skip locked limit 1;
  if v_id is null then return null; end if;
  update public.studio_paid_jobs set status='running',worker_id=p_worker,attempts=attempts+1,
    lease_expires_at=now()+make_interval(secs=>p_lease_seconds),updated_at=now() where id=v_id;
  return v_id;
end $$;

create or replace function studio_internal.heartbeat_job(p_job uuid,p_worker text,p_lease_seconds integer default 120)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_lease_seconds not between 30 and 600 then raise exception 'Invalid lease'; end if;
  update public.studio_paid_jobs set lease_expires_at=now()+make_interval(secs=>p_lease_seconds),updated_at=now()
    where id=p_job and status='running' and worker_id=p_worker and lease_expires_at>now();
  return found;
end $$;

create or replace function studio_internal.quarantine_expired_jobs()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.studio_paid_jobs set status='needs_reconciliation',updated_at=now()
    where status='running' and lease_expires_at<=now();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Reconciliation MUST follow independent provider billing verification.
-- Call only after checking the provider request and the final charge externally.
create or replace function studio_internal.reconcile_job(p_job uuid,p_actual_cents integer,p_provider_request_id text,p_success boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_production uuid; v_max integer; v_status text; v_actual integer;
begin
  if p_actual_cents is null or p_actual_cents<0 or p_success is null then raise exception 'Invalid reconciliation'; end if;
  select production_id into v_production from public.studio_paid_jobs where id=p_job;
  if not found then raise exception 'Job not found'; end if;
  perform 1 from public.studio_productions where id=v_production for update;
  select max_charge_cents,status,actual_charge_cents into v_max,v_status,v_actual
    from public.studio_paid_jobs where id=p_job for update;
  if v_status in ('completed','failed') then
    if v_actual<>p_actual_cents or (v_status='completed')<>p_success then raise exception 'Conflicting reconciliation'; end if;
    return;
  end if;
  -- Never silently accept a provider overcharge: retain the full reservation and require operator action.
  if p_actual_cents>v_max then raise exception 'Provider charge exceeds reserved maximum; manual incident handling required'; end if;
  update public.studio_paid_jobs set status=case when p_success then 'completed' else 'failed' end,
    actual_charge_cents=p_actual_cents,provider_request_id=p_provider_request_id,
    lease_expires_at=null,updated_at=now() where id=p_job;
end $$;

revoke all on function studio_internal.reserve_job(uuid,text,text,integer) from public, anon, authenticated;
revoke all on function studio_internal.claim_job(text,integer) from public, anon, authenticated;
revoke all on function studio_internal.heartbeat_job(uuid,text,integer) from public, anon, authenticated;
revoke all on function studio_internal.quarantine_expired_jobs() from public, anon, authenticated;
revoke all on function studio_internal.reconcile_job(uuid,integer,text,boolean) from public, anon, authenticated;
grant execute on function studio_internal.reserve_job(uuid,text,text,integer) to service_role;
grant execute on function studio_internal.claim_job(text,integer) to service_role;
grant execute on function studio_internal.heartbeat_job(uuid,text,integer) to service_role;
grant execute on function studio_internal.quarantine_expired_jobs() to service_role;
grant execute on function studio_internal.reconcile_job(uuid,integer,text,boolean) to service_role;
