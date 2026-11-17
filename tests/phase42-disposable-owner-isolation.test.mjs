import test from 'node:test';
import assert from 'node:assert/strict';
import {parseIsolationRows,runIsolationProbe} from '../scripts/run-disposable-owner-isolation.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const env={VISION_DISPOSABLE_DATABASE:'YES',VISION_TEST_DATABASE_URL:'postgresql://test@localhost/vision_disposable',VISION_TEST_DATABASE_HOST:'localhost',VISION_TEST_DATABASE_NAME:'vision_disposable',VISION_TEST_OWNER_A:a,VISION_TEST_OWNER_B:b};
test('requires both directions and all eight true results',()=>{
 assert.deepEqual(parseIsolationRows('A|t|t|t|t\nB|t|t|t|t\n'),{passed:true,checks:8});
 for(const s of ['A|t|t|t|f\nB|t|t|t|t','A|t|t|t|t','A|t|t|t|t\nB|t|t|t|t\nB|t|t|t|t'])assert.throws(()=>parseIsolationRows(s));
});
test('rejects missing disposable acknowledgement before contacting database',()=>{
 let called=false;
 assert.throws(()=>runIsolationProbe({env:{},spawn:()=>{called=true}}),/DISPOSABLE/);
 assert.equal(called,false);
});
test('rejects identical owners before contacting database',()=>{
 let called=false;
 assert.throws(()=>runIsolationProbe({env:{...env,VISION_TEST_OWNER_B:a},spawn:()=>{called=true}}),/distinct/);
 assert.equal(called,false);
});
test('passes only when psql reports all checks true',()=>{
 let calls=0;
 const result=runIsolationProbe({env,spawn:()=>++calls===1?{status:0}:{status:0,stdout:'A|t|t|t|t\nB|t|t|t|t\n'}});
 assert.equal(result.checks,8);
});
