-- Phase 34: DRAFT ONLY. Apply to a NEW dedicated Vision Studio database after phases 9/11/22.
-- This migration does not enable paid generation. Execute only after a PostgreSQL integration test.
-- All writes are service-only; never expose the service key to browser clients.
create schema if not exists studio_internal;
revoke all on schema studio_internal from public, anon, authenticated;
grant usage on schema studio_internal to service_role;

create table if not exists public.studio_render_revisions (
 production_id uuid primary key references public.studio_productions(id) on delete cascade,
 owner_id uuid not null references public.studio_owners(user_id),
 revision bigint not null default 0 check(revision >= 0),
 unique(production_id,owner_id),
 foreign key(production_id,owner_id) references public.studio_productions(id,owner_id)
);
create table if not exists public.studio_render_reviews (
 id uuid primary key default gen_random_uuid(),
 production_id uuid not null references public.studio_render_revisions(production_id),
 owner_id uuid not null references public.studio_owners(user_id),
 scene_id text not null check(length(scene_id) between 1 and 200),
 asset_id uuid not null references public.studio_assets(id),
 revision bigint not null default 0 check(revision>=0),
 ledger_revision bigint not null check(ledger_revision>=0),
 decision text not null default 'pending' check(decision in ('pending','approved','rejected')),
 unique(id,production_id),
 foreign key(production_id,owner_id) references public.studio_render_revisions(production_id,owner_id)
);
create table if not exists public.studio_render_jobs (
 id uuid primary key default gen_random_uuid(),
 production_id uuid not null references public.studio_render_revisions(production_id),
 owner_id uuid not null references public.studio_owners(user_id),
 review_id uuid not null,
 scene_id text not null,
 asset_id uuid not null references public.studio_assets(id),
 review_revision bigint not null,
 ledger_revision bigint not null,
 status text not null default 'queued' check(status in ('queued','running','completed','failed','revoked')),
 worker_id text,
 lease_token uuid,
 lease_expires_at timestamptz,
 created_at timestamptz not null default now(),
 unique(review_id,review_revision,asset_id),
 foreign key(review_id,production_id) references public.studio_render_reviews(id,production_id),
 foreign key(production_id,owner_id) references public.studio_render_revisions(production_id,owner_id)
);
create index if not exists studio_render_jobs_claim_idx on public.studio_render_jobs(status,created_at);

alter table public.studio_render_revisions enable row level security;
alter table public.studio_render_reviews enable row level security;
alter table public.studio_render_jobs enable row level security;
revoke all on public.studio_render_revisions,public.studio_render_reviews,public.studio_render_jobs from public,anon,authenticated;
grant select on public.studio_render_revisions,public.studio_render_reviews,public.studio_render_jobs to authenticated;
create policy "owner reads render revisions" on public.studio_render_revisions for select to authenticated using(owner_id=(select auth.uid()));
create policy "owner reads render reviews" on public.studio_render_reviews for select to authenticated using(owner_id=(select auth.uid()));
create policy "owner reads render jobs" on public.studio_render_jobs for select to authenticated using(owner_id=(select auth.uid()));

-- Serialize approvals and enqueue operations by locking the production revision row.
-- Trusted service authenticates the human actor before calling this RPC.
create or replace function studio_internal.approve_render_review(
 p_actor uuid,p_review uuid,p_expected_revision bigint,p_expected_ledger_revision bigint
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_review public.studio_render_reviews%rowtype; v_revision bigint;
begin
 if p_actor is null or p_expected_revision is null or p_expected_ledger_revision is null then return false; end if;
 select * into v_review from public.studio_render_reviews where id=p_review;
 if not found then return false; end if;
 select revision into v_revision from public.studio_render_revisions where production_id=v_review.production_id for update;
 -- Re-read after acquiring the serializing lock; a concurrent approval may have changed the review.
 select * into v_review from public.studio_render_reviews where id=p_review;
 if v_review.owner_id<>p_actor or v_review.decision<>'pending' or v_review.revision<>p_expected_revision
    or v_review.ledger_revision<>p_expected_ledger_revision or v_revision<>p_expected_ledger_revision then return false; end if;
 -- Application must persist complete human findings before requesting approval.
 update public.studio_render_reviews set decision='approved',revision=revision+1 where id=p_review;
 return true;
end $$;

create or replace function studio_internal.enqueue_approved_render(
 p_actor uuid,p_review uuid,p_asset uuid,p_expected_review_revision bigint,p_expected_ledger_revision bigint
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_review public.studio_render_reviews%rowtype; v_revision bigint; v_job uuid;
begin
 if p_actor is null or p_asset is null or p_expected_review_revision is null or p_expected_ledger_revision is null then return null; end if;
 select * into v_review from public.studio_render_reviews where id=p_review;
 if not found then return null; end if;
 select revision into v_revision from public.studio_render_revisions where production_id=v_review.production_id for update;
 -- Re-read after acquiring the serializing lock to avoid stale approval snapshots.
 select * into v_review from public.studio_render_reviews where id=p_review;
 if v_review.owner_id<>p_actor or v_review.decision<>'approved' or v_review.revision<>p_expected_review_revision
   or v_review.ledger_revision<>p_expected_ledger_revision or v_revision<>p_expected_ledger_revision or v_review.asset_id<>p_asset then return null; end if;
 if not exists(select 1 from public.studio_assets a join public.studio_productions p on p.id=a.production_id
   where a.id=p_asset and a.production_id=v_review.production_id and a.owner_id=v_review.owner_id and a.project_id=p.project_id) then return null; end if;
 insert into public.studio_render_jobs(production_id,owner_id,review_id,scene_id,asset_id,review_revision,ledger_revision)
 values(v_review.production_id,v_review.owner_id,v_review.id,v_review.scene_id,p_asset,v_review.revision,v_revision)
 on conflict(review_id,review_revision,asset_id) do nothing returning id into v_job;
 if v_job is null then select id into v_job from public.studio_render_jobs where review_id=p_review and review_revision=p_expected_review_revision and asset_id=p_asset; end if;
 return v_job;
end $$;

create or replace function studio_internal.claim_approved_render(p_worker text,p_lease_seconds integer default 120)
returns table(job_id uuid,lease_token uuid) language plpgsql security definer set search_path='' as $$
declare v_job uuid; v_token uuid; v_production uuid;
begin
 if p_worker is null or length(p_worker) not between 8 and 120 or p_lease_seconds not between 30 and 600 then return; end if;
 -- Claim the production revision lock BEFORE any job lock. This matches
 -- confirm_render_authorization and invalidate_render_approvals and avoids
 -- a claim-vs-invalidation lock-order deadlock.
 select l.production_id into v_production from public.studio_render_revisions l
 where exists (
   select 1 from public.studio_render_jobs j
   join public.studio_render_reviews r on r.id=j.review_id
   where j.production_id=l.production_id and j.status='queued'
     and r.decision='approved' and r.revision=j.review_revision
     and l.revision=j.ledger_revision and r.ledger_revision=l.revision
 )
 order by l.production_id for update of l skip locked limit 1;
 if v_production is null then return; end if;
 -- Re-evaluate eligibility after the revision lock; do not trust the
 -- pre-lock candidate snapshot.
 select j.id into v_job from public.studio_render_jobs j
 join public.studio_render_reviews r on r.id=j.review_id
 join public.studio_render_revisions l on l.production_id=j.production_id
 where j.production_id=v_production and j.status='queued'
   and r.decision='approved' and r.revision=j.review_revision
   and l.revision=j.ledger_revision and r.ledger_revision=l.revision
 order by j.created_at,j.id for update of j skip locked limit 1;
 if v_job is null then return; end if;
 v_token=gen_random_uuid();
 update public.studio_render_jobs set status='running',worker_id=p_worker,lease_token=v_token,
 lease_expires_at=clock_timestamp()+make_interval(secs=>p_lease_seconds) where id=v_job;
 return query select v_job,v_token;
end $$;

-- Call just before rendering. A stale review/ledger or expired lease fails closed.
-- Lock order is always production revision, then render job, matching invalidation.
-- The initial job lookup is intentionally unlocked; it is re-read after both locks.
create or replace function studio_internal.confirm_render_authorization(p_job uuid,p_worker text,p_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_job public.studio_render_jobs%rowtype; v_revision bigint; v_review public.studio_render_reviews%rowtype; v_production uuid;
begin
 select production_id into v_production from public.studio_render_jobs where id=p_job;
 if v_production is null then return false; end if;
 select revision into v_revision from public.studio_render_revisions where production_id=v_production for update;
 if not found then return false; end if;
 select * into v_job from public.studio_render_jobs where id=p_job for update;
 if not found or v_job.production_id is distinct from v_production or v_job.status<>'running'
    or v_job.worker_id is distinct from p_worker or v_job.lease_token is distinct from p_token
    or v_job.lease_expires_at<=clock_timestamp() then return false; end if;
 select * into v_review from public.studio_render_reviews where id=v_job.review_id;
 if not found then return false; end if;
 return v_revision=v_job.ledger_revision and v_review.decision='approved' and v_review.revision=v_job.review_revision
    and v_review.ledger_revision=v_revision and v_review.asset_id=v_job.asset_id;
end $$;

-- Any change to the canonical continuity revision must invalidate queued/running jobs.
create or replace function studio_internal.invalidate_render_approvals(p_production uuid,p_expected_revision bigint)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.studio_render_revisions set revision=revision+1 where production_id=p_production and revision=p_expected_revision;
 if not found then return false; end if;
 update public.studio_render_jobs set status='revoked' where production_id=p_production and status in ('queued','running');
 return true;
end $$;

revoke all on function studio_internal.approve_render_review(uuid,uuid,bigint,bigint) from public,anon,authenticated;
revoke all on function studio_internal.enqueue_approved_render(uuid,uuid,uuid,bigint,bigint) from public,anon,authenticated;
revoke all on function studio_internal.claim_approved_render(text,integer) from public,anon,authenticated;
revoke all on function studio_internal.confirm_render_authorization(uuid,text,uuid) from public,anon,authenticated;
revoke all on function studio_internal.invalidate_render_approvals(uuid,bigint) from public,anon,authenticated;
grant execute on function studio_internal.approve_render_review(uuid,uuid,bigint,bigint) to service_role;
grant execute on function studio_internal.enqueue_approved_render(uuid,uuid,uuid,bigint,bigint) to service_role;
grant execute on function studio_internal.claim_approved_render(text,integer) to service_role;
grant execute on function studio_internal.confirm_render_authorization(uuid,text,uuid) to service_role;
grant execute on function studio_internal.invalidate_render_approvals(uuid,bigint) to service_role;
