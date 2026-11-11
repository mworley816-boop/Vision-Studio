import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateTestTarget,runTransactionTests} from '../scripts/run-postgres-transaction-tests.mjs';
const sql=readFileSync(new URL('../supabase/phase34-render-authorization.sql',import.meta.url),'utf8');
test('database tests require explicit disposable target opt-in',()=>assert.throws(()=>validateTestTarget({VISION_TEST_DATABASE_URL:'postgres://localhost/studio'}),/DISPOSABLE/));
test('database tests reject system database',()=>assert.throws(()=>validateTestTarget({VISION_DISPOSABLE_DATABASE:'YES',VISION_TEST_DATABASE_URL:'postgres://localhost/postgres'}),/system/));
test('database tests do not run without psql',()=>assert.throws(()=>runTransactionTests({env:{VISION_DISPOSABLE_DATABASE:'YES',VISION_TEST_DATABASE_URL:'postgres://localhost/studio_test',VISION_TEST_DATABASE_HOST:'localhost',VISION_TEST_DATABASE_NAME:'studio_test'},spawn:()=>({status:1})}),/psql/));
test('approval and enqueue re-read review after serializing lock',()=>{
 const checks=sql.match(/select \* into v_review from public\.studio_render_reviews where id=p_review;/g)||[];
 assert.ok(checks.length>=4,'both RPCs must re-read review after locking');
});
test('SQL test fixture checks stale approvals and duplicate claims',()=>{
 const t=readFileSync(new URL('../supabase/phase36-transaction-tests.sql',import.meta.url),'utf8');
 for(const x of ['Duplicate claim','Stale render authorized','Wrong token authorized','Unapproved render accepted','rollback;'])assert.ok(t.includes(x));
});
