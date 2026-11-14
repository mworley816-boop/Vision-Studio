import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase12-approval-reviews.sql',import.meta.url),'utf8');
test('Phase 12 approval ledger is immutable to browser roles and has RLS',()=>{
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/grant select,insert on public\.studio_generation_approval_reviews to authenticated/i);
 assert.doesNotMatch(sql,/grant\s+[^;]*\b(update|delete)\b[^;]*to authenticated/i);
 assert.match(sql,/decision = 'reviewed_only'/i);
});
test('Phase 12 rejects stale revisions and budget overruns inside database transaction',()=>{
 assert.match(sql,/for share/i);
 assert.match(sql,/v_bible<>new\.project_revision/i);
 assert.match(sql,/v_story<>new\.production_revision/i);
 assert.match(sql,/new\.maximum_cost_cents>v_budget/i);
 assert.match(sql,/new\.owner_id is distinct from auth\.uid\(\)/i);
});
test('Phase 12 contains no paid queue authorization',()=>{
 assert.doesNotMatch(sql,/insert into public\.studio_paid_jobs/i);
 assert.doesNotMatch(sql,/reserve_job\(/i);
});
