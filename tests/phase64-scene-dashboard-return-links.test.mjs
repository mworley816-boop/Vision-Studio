import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/VisualEditor.tsx',import.meta.url),'utf8');
test('dashboard has a stable return target',()=>assert.match(source,/id="storyboard-preparation-dashboard"/));
test('scene editors offer a return link',()=>assert.match(source,/href="#storyboard-preparation-dashboard"/));
test('scene jump links are preserved',()=>assert.match(source,/href=\{'#storyboard-scene-'\+row.number\}/));
test('readiness dashboard remains planning only',()=>assert.match(source,/Provider pricing, image rights and actual generation readiness remain unverified/));
