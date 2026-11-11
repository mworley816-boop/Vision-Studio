import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../browser-tests/test_next_dashboard.py',import.meta.url),'utf8');
test('Next dashboard browser verifies offline migration in a fresh profile',()=>{
  assert.match(script,/migration_context = browser\.new_context\(\)/);
  assert.match(script,/vision-studio-offline-workspace-v3/);
  assert.match(script,/Migrated film/);
  assert.match(script,/Offline project not imported/);
});
test('Next dashboard browser verifies source retention and canonical persistence',()=>{
  assert.match(script,/Migration deleted original/);
  assert.match(script,/vision-studio-next-workspace-v2/);
  assert.match(script,/Migrated project not persistent/);
});
test('Next dashboard browser exercises damaged workspace and recovery download',()=>{
  assert.match(script,/Workspace recovery required/);
  assert.match(script,/expect_download/);
  assert.match(script,/Recovery flow overwrote original/);
});
