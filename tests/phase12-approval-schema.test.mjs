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

test('Phase 12 can be rechecked without duplicate trigger or policy definitions',()=>{
 assert.match(sql,/drop trigger if exists studio_validate_generation_approval_review_insert/i);
 assert.match(sql,/drop policy if exists "owner reads approval reviews"/i);
 assert.match(sql,/drop policy if exists "owner records nonspending approval review"/i);
 assert.match(sql,/revoke all on function public\.studio_validate_generation_approval_review\(\) from public,anon,authenticated/i);
});
