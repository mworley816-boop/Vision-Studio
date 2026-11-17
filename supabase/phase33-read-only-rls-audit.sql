-- Phase 33: READ-ONLY security inspection for a dedicated Vision Studio database.
-- No inserts, updates, deletes, role changes or policy changes.
-- A passing catalog audit does NOT replace authenticated cross-owner integration tests.
with required(table_name) as (
 values ('studio_owners'),('studio_projects'),('studio_productions')
), checks as (
 select r.table_name,
        c.oid is not null as table_exists,
        coalesce(c.relrowsecurity,false) as rls_enabled,
        exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=r.table_name
          and 'authenticated'=any(p.roles) and p.cmd in ('SELECT','ALL')
          and p.qual ilike '%auth.uid()%') as authenticated_owner_policy_present
 from required r
 left join pg_class c on c.relname=r.table_name and c.relnamespace='public'::regnamespace and c.relkind in ('r','p')
)
select *, (table_exists and rls_enabled and authenticated_owner_policy_present) as basic_catalog_check_passed
from checks order by table_name;
