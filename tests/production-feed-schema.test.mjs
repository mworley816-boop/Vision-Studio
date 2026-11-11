import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase47-production-feed.sql',import.meta.url),'utf8');
test('feed uses security-invoker view and owner scoped RLS',()=>{
 assert.match(sql,/security_invoker\s*=\s*true/i);
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/owner_id\s*=\s*\(select auth\.uid\(\)\)/i);
});
test('browser roles have no snapshot write grants',()=>{
 assert.match(sql,/revoke all on public\.studio_workflow_snapshots from public, anon, authenticated/i);
 assert.match(sql,/grant select on public\.studio_workflow_snapshots to authenticated/i);
 assert.doesNotMatch(sql,/grant\s+(insert|update|delete|all)\s+on public\.studio_workflow_snapshots to authenticated/i);
});
test('view joins owner and project to production',()=>{
 assert.match(sql,/p\.owner_id=w\.owner_id and p\.project_id=w\.project_id/i);
 assert.match(sql,/w\.kind=p\.kind and w\.mode=p\.mode/i);
});
test('snapshots enforce per-kind budget cap and unique production',()=>{
 assert.match(sql,/unique\s*\(production_id\)/i);
 assert.match(sql,/spent_cents \+ reserved_cents <= case kind when 'music' then 500 else 2000 end/i);
});
