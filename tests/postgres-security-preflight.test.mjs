import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSecuritySql,parseSecurityRows,signatures,checkSecurity} from '../scripts/check-postgres-security.mjs';
const ok=signatures.map(s=>`${s}|ok`).join('\n');
test('audits exact signatures and privileged execution',()=>{
 const sql=buildSecuritySql();
 assert.match(sql,/to_regprocedure/);
 assert.match(sql,/has_function_privilege\('anon'/);
 assert.match(sql,/has_function_privilege\('authenticated'/);
 assert.match(sql,/search_path=/);
 assert.equal(parseSecurityRows(ok).length,5);
});
test('rejects missing and unsafe functions',()=>{
 for(const status of ['missing','unsafe_config','public_execute','service_denied'])assert.throws(()=>parseSecurityRows(ok.replace('|ok',`|${status}`)),/security preflight failed/);
 assert.throws(()=>parseSecurityRows(ok.split('\n').slice(1).join('\n')));
 assert.throws(()=>parseSecurityRows(ok+'\n'+ok.split('\n')[0]));
});
test('does not contact database without disposable opt-in',()=>{
 let called=false;
 assert.throws(()=>checkSecurity({env:{},spawn:()=>{called=true;return {status:0}}}),/DISPOSABLE/);
 assert.equal(called,false);
});
test('fails closed when psql is unavailable',()=>{
 const env={VISION_DISPOSABLE_DATABASE:'YES',VISION_TEST_DATABASE_URL:'postgresql://test@localhost/vision_disposable',VISION_TEST_DATABASE_HOST:'localhost',VISION_TEST_DATABASE_NAME:'vision_disposable'};
 assert.throws(()=>checkSecurity({env,spawn:()=>({status:1})}),/psql is required/);
});
test('reports verified signatures only after successful read-only query',()=>{
 const env={VISION_DISPOSABLE_DATABASE:'YES',VISION_TEST_DATABASE_URL:'postgresql://test@localhost/vision_disposable',VISION_TEST_DATABASE_HOST:'localhost',VISION_TEST_DATABASE_NAME:'vision_disposable'};
 const calls=[];
 const result=checkSecurity({env,spawn:(cmd,args)=>{calls.push(args);return calls.length===1?{status:0}:{status:0,stdout:ok}}});
 assert.equal(result.signatures.length,5);
 assert.ok(calls[1].includes('-c'));
});
