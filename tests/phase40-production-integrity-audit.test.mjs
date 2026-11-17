import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase40-read-only-production-integrity-audit.sql',import.meta.url),'utf8');
test('live production audit requires validated constraint and owner linkage without modifying records',()=>{
 for(const s of ['convalidated','studio_productions_kind_budget_pair_check','studio_projects','pr.owner_id=p.owner_id','mismatched_budget_rows','orphaned_or_cross_owner_rows'])assert.ok(sql.includes(s));
 assert.doesNotMatch(sql,/^\s*(?:insert|update|delete|alter|create|drop|truncate|grant|revoke)\b/im);
});
