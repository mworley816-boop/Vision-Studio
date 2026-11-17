import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase37-proposed-kind-budget-check.sql',import.meta.url),'utf8');
test('migration requires explicit approval and correct production cap pairing',()=>{
 assert.match(sql,/APPROVAL REQUIRED/);
 assert.match(sql,/kind='music' and budget_cents=500/);
 assert.match(sql,/kind='episode' and budget_cents=2000/);
 assert.match(sql,/^-- alter table public\.studio_productions/m);
 assert.doesNotMatch(sql,/^\s*alter\s+table\b/im);
});
