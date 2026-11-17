-- Phase 45: read-only audit. No inserts, updates, migrations, or paid jobs.
-- A production must match its parent project type and the fixed spending cap.
select
 count(*) filter (where p.id is null) as orphaned_productions,
 count(*) filter (where p.id is not null and p.owner_id is distinct from r.owner_id) as cross_owner_productions,
 count(*) filter (where p.id is not null and not (
   (p.kind='music' and r.kind='music' and r.budget_cents=500)
   or (p.kind='series' and r.kind='episode' and r.budget_cents=2000)
 )) as mismatched_project_production_pairs,
 count(*) filter (where p.id is null or p.owner_id is distinct from r.owner_id or not (
   (p.kind='music' and r.kind='music' and r.budget_cents=500)
   or (p.kind='series' and r.kind='episode' and r.budget_cents=2000)
 )) = 0 as project_production_integrity_passed
from public.studio_productions r
left join public.studio_projects p on p.id=r.project_id;
