import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase38-read-only-budget-constraint-readiness.sql',import.meta.url),'utf8');
test('constraint readiness audit checks mismatches and actual installation without writing',()=>{
 for(const term of ['studio_productions','budget_cents=500','budget_cents=2000','pg_constraint','convalidated','mismatched_rows'])assert.ok(sql.includes(term));
 assert.doesNotMatch(sql,/^\s*(?:insert|update|delete|alter|create|drop|truncate|grant|revoke)\b/im);
});
