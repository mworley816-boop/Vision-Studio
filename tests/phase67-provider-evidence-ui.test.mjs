import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/GenerationPreflight.tsx',import.meta.url),'utf8');
test('provider evidence preview UI exists',()=>assert.match(source,/Preview provider pricing evidence · No charge/));
test('UI calls preview-only server endpoint',()=>assert.match(source,/fetch\('\/api\/provider-evidence-preview'/));
test('UI requires fail-closed safety flags',()=>assert.match(source,/data.trustedProviderPricing!==false/));
test('UI warns not to enter API keys',()=>assert.match(source,/Never enter API keys here/));
test('existing trusted pricing inspection remains',()=>assert.match(source,/Inspect Phase 16 trusted pricing · No charge/));
