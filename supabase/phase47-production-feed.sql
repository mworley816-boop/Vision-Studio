-- Phase 47: DRAFT; apply only to isolated Supabase-compatible test database.
-- This does not backfill workflow states or activate paid jobs.
create table if not exists public.studio_workflow_snapshots (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.studio_owners(user_id),
 project_id uuid not null references public.studio_projects(id) on delete cascade,
 production_id uuid not null references public.studio_productions(id) on delete cascade,
 kind text not null check (kind in ('music','episode')),
 mode text not null check (mode in ('auto','approval')),
 status text not null check (status in ('draft','awaiting_storyboard_approval','preparing','awaiting_asset_approval','ready_to_render','rendering','awaiting_export_approval','complete','failed','cancelled')),
 version bigint not null default 0 check (version >= 0),
 spent_cents integer not null default 0 check (spent_cents >= 0),
 reserved_cents integer not null default 0 check (reserved_cents >= 0),
 export_asset_id uuid references public.studio_assets(id),
 unique (production_id),
 foreign key (production_id,owner_id) references public.studio_productions(id,owner_id),
 check (spent_cents + reserved_cents <= case kind when 'music' then 500 else 2000 end)
);
create index if not exists studio_workflow_snapshots_owner_project_idx on public.studio_workflow_snapshots(owner_id,project_id);
alter table public.studio_workflow_snapshots enable row level security;
revoke all on public.studio_workflow_snapshots from public, anon, authenticated;
grant select on public.studio_workflow_snapshots to authenticated;
create policy "owner reads workflow snapshots" on public.studio_workflow_snapshots
 for select to authenticated using (owner_id = (select auth.uid()));
-- Security invoker ensures underlying RLS is evaluated for the querying role.
create or replace view public.studio_production_feed with (security_invoker = true) as
select w.id, w.owner_id, w.project_id, w.production_id, w.kind, w.mode,
       w.status, w.version, w.spent_cents, w.reserved_cents, w.export_asset_id
from public.studio_workflow_snapshots w
join public.studio_productions p on p.id=w.production_id and p.owner_id=w.owner_id and p.project_id=w.project_id
where w.kind=p.kind and w.mode=p.mode;
revoke all on public.studio_production_feed from public, anon, authenticated;
grant select on public.studio_production_feed to authenticated;
-- Never grant snapshot INSERT/UPDATE/DELETE to browser roles. A trusted
-- server-side writer with verified owner identity and transactional checks is
-- required before this view can show live workflow progress.
