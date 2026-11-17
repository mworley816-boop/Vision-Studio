-- Phase 40: read-only audit of the deployed budget constraint and production ownership.
-- This query does not impersonate a second authenticated user; cross-owner RLS
-- behavior still requires a separate disposable-database integration test.
with checks as (
 select
  (select count(*) from public.studio_productions
   where not ((kind='music' and budget_cents=500)
           or (kind='episode' and budget_cents=2000))) as mismatched_budget_rows,
  (select count(*) from public.studio_productions p
   where not exists (select 1 from public.studio_projects pr
                     where pr.id=p.project_id and pr.owner_id=p.owner_id)) as orphaned_or_cross_owner_rows,
  exists (select 1 from pg_constraint
          where conrelid='public.studio_productions'::regclass
            and conname='studio_productions_kind_budget_pair_check'
            and contype='c' and convalidated
            and pg_get_constraintdef(oid) ilike '%budget_cents%') as constraint_validated
)
select *, (mismatched_budget_rows=0 and orphaned_or_cross_owner_rows=0 and constraint_validated)
  as integrity_audit_passed
from checks;
