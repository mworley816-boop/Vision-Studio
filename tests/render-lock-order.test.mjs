import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase34-render-authorization.sql',import.meta.url),'utf8');
const fn=(name)=>sql.split(`create or replace function studio_internal.${name}(`)[1]?.split('end $$;')[0];
test('confirmation locks revision before job to avoid invalidation deadlock',()=>{
 const body=fn('confirm_render_authorization');
 assert.ok(body);
 const revision=body.indexOf('from public.studio_render_revisions where production_id=v_production for update');
 const job=body.indexOf('from public.studio_render_jobs where id=p_job for update');
 assert.ok(revision>=0 && job>revision);
});
test('confirmation rechecks job and worker after locking',()=>{
 const body=fn('confirm_render_authorization');
 for(const check of ['v_job.production_id is distinct from v_production','v_job.status', 'v_job.worker_id is distinct from p_worker','v_job.lease_token is distinct from p_token'])assert.ok(body.includes(check));
});
test('confirmation uses wall-clock lease expiry after lock wait',()=>assert.match(fn('confirm_render_authorization'),/lease_expires_at<=clock_timestamp\(\)/));
test('invalidation locks revision before modifying jobs',()=>{
 const body=fn('invalidate_render_approvals');
 assert.ok(body.indexOf('update public.studio_render_revisions')<body.indexOf('update public.studio_render_jobs'));
});
