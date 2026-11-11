import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow = readFileSync(new URL('../.github/workflows/verify-application.yml', import.meta.url), 'utf8');
test('application verification workflow can be dispatched manually', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /runs-on: ubuntu-latest/);
});
test('workflow builds the real Next.js app after installing dependencies', () => {
  assert.match(workflow, /npm install --no-audit --no-fund/);
  assert.match(workflow, /npm run build/);
  assert.ok(workflow.indexOf('npm install') < workflow.indexOf('npm run build'));
});
test('workflow runs automated and source tests', () => {
  for (const cmd of ['npm test','npm run check:source','npm run check:typescript-source','npm run check:module-graph']) assert.ok(workflow.includes(cmd),cmd);
});
test('workflow is read-only and has no deployment or paid provider step', () => {
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.doesNotMatch(workflow, /npm run deploy|wrangler deploy|supabase db push|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});

test('workflow uses reproducible npm ci when a lockfile exists', () => {
  assert.match(workflow, /if \[ -f package-lock\.json \]; then/);
  assert.match(workflow, /npm ci --no-audit --no-fund/);
});
test('workflow preserves build logs on compilation failure', () => {
  assert.match(workflow, /set -o pipefail/);
  assert.match(workflow, /tee vision-build\.log/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});
