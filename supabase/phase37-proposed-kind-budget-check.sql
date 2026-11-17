-- Phase 37: PROPOSED migration. NOT automatically deployed.
-- Before applying: inspect existing rows, review maintenance window, and obtain approval.
-- Existing rows must satisfy the predicate before the constraint is validated.
select kind,budget_cents,count(*) as row_count
from public.studio_productions
group by kind,budget_cents
order by kind,budget_cents;

-- STOP if this query returns any rows; investigate without modifying data.
select id,kind,budget_cents
from public.studio_productions
where not ((kind='music' and budget_cents=500)
        or (kind='episode' and budget_cents=2000));

-- APPROVAL REQUIRED: execute the following separately, after reviewing the checks.
-- alter table public.studio_productions
--   add constraint studio_productions_kind_budget_pair_check
--   check ((kind='music' and budget_cents=500)
--       or (kind='episode' and budget_cents=2000));
