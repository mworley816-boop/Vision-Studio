import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { waitForHttpReady } from '../scripts/wait-for-next.mjs';

test('waits for Next.js to return HTTP 200 after initial connection failures', async () => {
  let count = 0;
  const result = await waitForHttpReady({url:'http://localhost:4190',attempts:4,intervalMs:0,sleep:async()=>{},fetcher:async()=>{
    count++;
    if (count===1) throw new Error('ECONNREFUSED');
    return {status:count===2?503:200};
  }});
  assert.deepEqual(result,{attempts:3,status:200});
});
test('fails closed after readiness deadline', async () => {
  await assert.rejects(waitForHttpReady({url:'http://localhost:4190',attempts:2,intervalMs:0,sleep:async()=>{},fetcher:async()=>({status:503})}),/not ready after 2 attempts: HTTP 503/);
});
test('rejects invalid readiness configuration', async () => {
  await assert.rejects(waitForHttpReady({url:'',attempts:0}),/Invalid readiness configuration/);
});
test('CI waits for Next readiness before launching browser and retains log', () => {
  const workflow=readFileSync(new URL('../.github/workflows/verify-application.yml',import.meta.url),'utf8');
  const wait=workflow.indexOf('node scripts/wait-for-next.mjs');
  const browser=workflow.indexOf('python browser-tests/test_next_dashboard.py');
  assert.ok(wait>=0 && browser>wait);
  assert.match(workflow,/vision-next-readiness\.log/);
});
