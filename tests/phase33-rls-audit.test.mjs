import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase33-read-only-rls-audit.sql',import.meta.url),'utf8');
test('RLS audit is catalog-only and checks three owner-scoped tables',()=>{
 for(const table of ['studio_owners','studio_projects','studio_productions'])assert.ok(sql.includes(table));
 for(const catalog of ['pg_class','pg_policies','relrowsecurity','auth.uid()'])assert.ok(sql.includes(catalog));
 assert.doesNotMatch(sql,/^\s*(?:insert|update|delete|alter|create|drop|truncate|grant|revoke|set\s+role)\b/im);
});
