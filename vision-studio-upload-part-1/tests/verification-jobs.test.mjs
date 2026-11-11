import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const yaml=readFileSync(new URL('../.github/workflows/verify-application.yml',import.meta.url),'utf8');
const job=(name)=>{const start=yaml.indexOf(`  ${name}:\n`);assert.ok(start>=0,`Missing ${name}`);const rest=yaml.slice(start+name.length+4);const next=rest.search(/^  (?:application-build|browser-preview|next-dashboard-browser):/m);return next<0?rest:rest.slice(0,next);};
test('build and browser tests are independent GitHub Actions jobs',()=>{assert.match(yaml,/^  application-build:/m);assert.match(yaml,/^  browser-preview:/m);assert.doesNotMatch(job('application-build'),/needs:/);assert.doesNotMatch(job('browser-preview'),/needs:/);});
test('Next.js build is not gated on Chromium success',()=>{assert.match(job('application-build'),/npm run build/);assert.doesNotMatch(job('application-build'),/playwright install/);});
test('browser smoke test is not gated on npm dependency installation',()=>{assert.match(job('browser-preview'),/python browser-tests\/test_preview.py/);assert.doesNotMatch(job('browser-preview'),/npm (ci|install)/);});
test('both jobs preserve diagnostic logs even when tests fail',()=>{assert.match(job('application-build'),/if: always\(\)/);assert.match(job('browser-preview'),/if: always\(\)/);assert.match(job('application-build'),/vision-build-log/);assert.match(job('browser-preview'),/vision-browser-log/);});
