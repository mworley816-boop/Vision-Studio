-- Run ONLY against a dedicated disposable Supabase test database with phases 9, 11, 22, 34 already applied.
-- All test data changes are rolled back. Never run against production.
\set ON_ERROR_STOP on
begin;
do $$
declare
 v_owner uuid; v_project uuid; v_production uuid; v_asset uuid; v_review uuid; v_job uuid;
 v_claim record; v_claim2 record;
begin
 -- Reuse an enrolled test owner; this script never creates an auth user.
 select user_id into v_owner from public.studio_owners limit 1;
 if v_owner is null then raise exception 'Dedicated test database needs one test owner'; end if;
 insert into public.studio_projects(owner_id,title,kind) values(v_owner,'Phase36 disposable project','music') returning id into v_project;
 insert into public.studio_productions(project_id,owner_id,title,kind,mode,budget_cents)
 values(v_project,v_owner,'Phase36 test','music','approval',500) returning id into v_production;
 insert into public.studio_assets(owner_id,project_id,production_id,storage_path,media_type)
 values(v_owner,v_project,v_production,v_owner::text||'/phase36/'||gen_random_uuid()::text,'image/png') returning id into v_asset;
 insert into public.studio_render_revisions(production_id,owner_id,revision) values(v_production,v_owner,0);
 insert into public.studio_render_reviews(production_id,owner_id,scene_id,asset_id,revision,ledger_revision)
 values(v_production,v_owner,'scene-1',v_asset,0,0) returning id into v_review;
 if studio_internal.enqueue_approved_render(v_owner,v_review,v_asset,0,0) is not null then raise exception 'Unapproved render accepted'; end if;
 if studio_internal.approve_render_review(gen_random_uuid(),v_review,0,0) then raise exception 'Wrong actor approved'; end if;
 if not studio_internal.approve_render_review(v_owner,v_review,0,0) then raise exception 'Owner approval rejected'; end if;
 if studio_internal.approve_render_review(v_owner,v_review,0,0) then raise exception 'Duplicate approval accepted'; end if;
 v_job:=studio_internal.enqueue_approved_render(v_owner,v_review,v_asset,1,0);
 if v_job is null then raise exception 'Approved render not enqueued'; end if;
 if studio_internal.enqueue_approved_render(v_owner,v_review,v_asset,1,0) is distinct from v_job then raise exception 'Idempotent enqueue failed'; end if;
 select * into v_claim from studio_internal.claim_approved_render('phase36-worker-a',120);
 if v_claim.job_id is distinct from v_job then raise exception 'Worker did not claim expected job'; end if;
 select * into v_claim2 from studio_internal.claim_approved_render('phase36-worker-b',120);
 if v_claim2.job_id is not null then raise exception 'Duplicate claim'; end if;
 if studio_internal.confirm_render_authorization(v_job,'phase36-worker-a',gen_random_uuid()) then raise exception 'Wrong token authorized'; end if;
 if not studio_internal.confirm_render_authorization(v_job,'phase36-worker-a',v_claim.lease_token) then raise exception 'Valid lease denied'; end if;
 if not studio_internal.invalidate_render_approvals(v_production,0) then raise exception 'Invalidation failed'; end if;
 if studio_internal.confirm_render_authorization(v_job,'phase36-worker-a',v_claim.lease_token) then raise exception 'Stale render authorized'; end if;
 raise notice 'Phase36 transactional checks passed (all writes will roll back)';
end $$;
rollback;
