import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase45-read-only-project-kind-audit.sql',import.meta.url),'utf8');
test('audit covers orphaned, cross-owner, wrong-kind and wrong-budget rows',()=>{
 for(const token of ['left join public.studio_projects','p.id is null','p.owner_id is distinct from r.owner_id',"p.kind='music'","r.kind='music'","r.budget_cents=500","p.kind='series'","r.kind='episode'","r.budget_cents=2000",'project_production_integrity_passed'])assert.ok(sql.includes(token),token);
});
test('audit contains no data mutations',()=>{
 const clean=sql.replace(/--[^\n]*/g,'');
 assert.doesNotMatch(clean,/\b(insert|update|delete|alter|drop|create|truncate|grant|revoke|execute|call)\b/i);
});
