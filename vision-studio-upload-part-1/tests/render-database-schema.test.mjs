import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase34-render-authorization.sql',import.meta.url),'utf8');
test('render records use owner scoped foreign keys and RLS',()=>{
 assert.match(sql,/foreign key\(production_id,owner_id\)/i);
 assert.equal((sql.match(/enable row level security/g)||[]).length,3);
 assert.match(sql,/revoke all on public\.studio_render_revisions,public\.studio_render_reviews,public\.studio_render_jobs from public,anon,authenticated/);
});
test('enqueue serializes on production and rechecks approval and asset',()=>{
 assert.match(sql,/create or replace function studio_internal\.enqueue_approved_render/);
 assert.match(sql,/where production_id=v_review\.production_id for update/);
 assert.match(sql,/v_review\.decision<>'approved'/);
 assert.match(sql,/a\.project_id=p\.project_id/);
});
test('claims skip locked and require current review revision',()=>{
 assert.match(sql,/for update of j skip locked limit 1/);
 assert.match(sql,/r\.revision=j\.review_revision/);
 assert.match(sql,/l\.revision=j\.ledger_revision/);
});
test('worker confirmation checks lease token, expiry and revision',()=>{
 assert.match(sql,/v_job\.lease_token is distinct from p_token/);
 assert.match(sql,/v_job\.lease_expires_at<=clock_timestamp\(\)/);
 assert.match(sql,/v_review\.decision='approved'/);
});
test('continuity changes revoke active jobs and functions are service-only',()=>{
 assert.match(sql,/set status='revoked'/);
 assert.match(sql,/grant execute on function studio_internal\.confirm_render_authorization.*to service_role/);
 assert.doesNotMatch(sql,/grant execute on function .* to authenticated/);
});
