import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase41-disposable-cross-owner-read-probe.sql',import.meta.url),'utf8');
test('cross-owner RLS probe requires both directions and own-row positive controls',()=>{
 for(const x of ['begin read only','set local role authenticated',"'request.jwt.claim.sub'","a_cannot_read_b_projects","b_cannot_read_a_projects","a_can_read_own_productions","b_can_read_own_productions","rollback"])assert.ok(sql.includes(x));
 assert.equal((sql.match(/begin read only;/g)||[]).length,2);
 assert.doesNotMatch(sql,/^\s*(?:insert|update|delete|alter|create|drop|truncate|grant|revoke)\b/im);
});
