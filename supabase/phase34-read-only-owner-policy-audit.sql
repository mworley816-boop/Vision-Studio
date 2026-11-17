-- Phase 34: read-only inspection of actual owner-policy predicates.
-- This is a static policy catalog audit, not a simulated cross-user login.
with required(table_name,owner_column) as (
 values ('studio_owners','user_id'),('studio_projects','owner_id'),('studio_productions','owner_id')
), checks as (
 select r.table_name,
   coalesce(c.relrowsecurity,false) as rls_enabled,
   exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=r.table_name
     and 'authenticated'=any(p.roles) and p.cmd in ('SELECT','ALL')
     and p.qual ilike '%auth.uid()%'
     and p.qual ilike '%'||r.owner_column||'%') as owner_read_predicate_present,
   not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=r.table_name
     and (('anon'=any(p.roles)) or ('public'=any(p.roles)))
     and p.cmd in ('SELECT','ALL')) as no_anon_or_public_read_policy,
   not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=r.table_name
     and 'authenticated'=any(p.roles) and p.cmd in ('INSERT','UPDATE','ALL')
     and (p.with_check is null or p.with_check not ilike '%auth.uid()%'
       or p.with_check not ilike '%'||r.owner_column||'%')) as no_unscoped_authenticated_write_policy
 from required r left join pg_class c on c.relname=r.table_name
   and c.relnamespace='public'::regnamespace and c.relkind in ('r','p')
)
select *, (rls_enabled and owner_read_predicate_present and no_anon_or_public_read_policy
 and no_unscoped_authenticated_write_policy) as basic_policy_check_passed
from checks order by table_name;
