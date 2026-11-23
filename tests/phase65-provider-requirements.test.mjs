import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/GenerationPreflight.tsx',import.meta.url),'utf8');
test('provider prerequisites are visible and collapsible',()=>assert.match(source,/Provider setup requirements · No charge/));
test('provider setup requires trustworthy quote with currency and expiry',()=>{assert.match(source,/currency, units, provider\/model identity and expiration/);assert.match(source,/Configure provider credentials privately on the server/);});
test('budget and manual authorization remain explicit',()=>{assert.match(source,/\$5 music-video or \$20 episode hard cap/);assert.match(source,/planning acknowledgment is not spending authorization/);});
test('existing fail-closed provider inspection remains available',()=>{assert.match(source,/Inspect Phase 15 provider pricing · No charge/);assert.match(source,/Inspect Phase 95 provider readiness · No charge/);});
