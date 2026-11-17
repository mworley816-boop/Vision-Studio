-- Phase 38: read-only pre-deployment verification; does NOT install a constraint.
with checks as (
 select
  (select count(*) from public.studio_productions
   where not ((kind='music' and budget_cents=500)
           or (kind='episode' and budget_cents=2000))) as mismatched_rows,
  exists (
   select 1 from pg_constraint
   where conrelid='public.studio_productions'::regclass
     and conname='studio_productions_kind_budget_pair_check'
     and contype='c' and convalidated
  ) as paired_constraint_installed_and_validated
)
select mismatched_rows, paired_constraint_installed_and_validated,
       (mismatched_rows=0) as existing_rows_compatible
from checks;
