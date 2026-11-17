import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase34-read-only-owner-policy-audit.sql',import.meta.url),'utf8');
test('phase34 audit checks owner-scoped read and write policies',()=>{
 for(const word of ['studio_owners','studio_projects','studio_productions','auth.uid()','with_check','anon','public','owner_id','user_id'])assert.ok(sql.includes(word));
 assert.doesNotMatch(sql,/^\s*(?:insert|update|delete|alter|create|drop|truncate|grant|revoke|set\s+role)\b/im);
});
