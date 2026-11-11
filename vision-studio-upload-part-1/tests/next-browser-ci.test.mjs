import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/verify-application.yml',import.meta.url),'utf8');
const browser=readFileSync(new URL('../browser-tests/test_next_dashboard.py',import.meta.url),'utf8');
test('Next dashboard has a separate real-browser CI job',()=>{
  assert.match(workflow,/next-dashboard-browser:/);
  assert.match(workflow,/python browser-tests\/test_next_dashboard\.py/);
  assert.match(workflow,/npm run dev -- --hostname 127\.0\.0\.1 --port 4190/);
});
test('Next dashboard browser test exercises persisted project creation',()=>{
  assert.match(browser,/Create project/);
  assert.match(browser,/page\.reload/);
  assert.match(browser,/Project not persisted after reload/);
});
test('Next dashboard browser failures preserve diagnostics',()=>{
  assert.match(browser,/failure\.txt/);
  assert.match(browser,/failure\.png/);
  assert.match(browser,/trace\.zip/);
  assert.match(workflow,/vision-next-browser-diagnostics/);
});
