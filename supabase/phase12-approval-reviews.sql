-- Phase 12 DRAFT: review on a dedicated Vision Studio staging database first.
-- Records a human's non-spending approval review; NEVER authorizes paid work.
create table if not exists public.studio_generation_approval_reviews (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.studio_owners(user_id),
 project_id uuid not null references public.studio_projects(id) on delete cascade,
 production_id uuid not null references public.studio_productions(id) on delete cascade,
 project_revision bigint not null check (project_revision >= 0),
 production_revision bigint not null check (production_revision >= 0),
 maximum_cost_cents integer not null check (maximum_cost_cents between 1 and 2000),
 decision text not null default 'reviewed_only' check (decision = 'reviewed_only'),
 created_at timestamptz not null default now(),
 unique(production_id,project_revision,production_revision,maximum_cost_cents,owner_id)
);
alter table public.studio_generation_approval_reviews enable row level security;
revoke all on public.studio_generation_approval_reviews from public,anon,authenticated;
grant select,insert on public.studio_generation_approval_reviews to authenticated;
create policy "owner reads approval reviews" on public.studio_generation_approval_reviews
 for select to authenticated using(owner_id=(select auth.uid()) and exists(select 1 from public.studio_owners o where o.user_id=(select auth.uid())));
-- Atomic current-revision check inside database, not only a stale browser snapshot.
create or replace function public.studio_validate_generation_approval_review()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_bible bigint; v_story bigint; v_budget integer;
begin
 if new.owner_id is distinct from auth.uid() or new.decision<>'reviewed_only' then raise exception 'Approval review owner or decision invalid'; end if;
 select revision into v_bible from public.studio_projects where id=new.project_id and owner_id=new.owner_id for share;
 select revision,budget_cents into v_story,v_budget from public.studio_productions
 where id=new.production_id and project_id=new.project_id and owner_id=new.owner_id for share;
 if v_bible is null or v_story is null or v_bible<>new.project_revision or v_story<>new.production_revision
    or new.maximum_cost_cents>v_budget then raise exception 'Approval review stale or exceeds budget'; end if;
 return new;
end $$;
create trigger studio_validate_generation_approval_review_insert before insert on public.studio_generation_approval_reviews
 for each row execute function public.studio_validate_generation_approval_review();
create policy "owner records nonspending approval review" on public.studio_generation_approval_reviews
 for insert to authenticated with check(owner_id=(select auth.uid()) and decision='reviewed_only'
 and exists(select 1 from public.studio_owners o where o.user_id=(select auth.uid())));
-- No UPDATE/DELETE grants, no paid-job privileges, no provider integration.
