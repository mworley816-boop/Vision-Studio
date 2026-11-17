-- Phase 41: run ONLY in an isolated disposable test database with two seeded
-- enrolled owners, projects and productions. Never run this against live data.
-- psql variables: owner_a and owner_b are distinct UUIDs.
-- A real authenticated-session API test remains necessary after this SQL probe.
begin read only;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_a', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select
 (select count(*) from public.studio_projects where owner_id=:'owner_b'::uuid)=0 as a_cannot_read_b_projects,
 (select count(*) from public.studio_productions where owner_id=:'owner_b'::uuid)=0 as a_cannot_read_b_productions,
 (select count(*) from public.studio_projects where owner_id=:'owner_a'::uuid)>0 as a_can_read_own_projects,
 (select count(*) from public.studio_productions where owner_id=:'owner_a'::uuid)>0 as a_can_read_own_productions;
rollback;
begin read only;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_b', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select
 (select count(*) from public.studio_projects where owner_id=:'owner_a'::uuid)=0 as b_cannot_read_a_projects,
 (select count(*) from public.studio_productions where owner_id=:'owner_a'::uuid)=0 as b_cannot_read_a_productions,
 (select count(*) from public.studio_projects where owner_id=:'owner_b'::uuid)>0 as b_can_read_own_projects,
 (select count(*) from public.studio_productions where owner_id=:'owner_b'::uuid)>0 as b_can_read_own_productions;
rollback;
