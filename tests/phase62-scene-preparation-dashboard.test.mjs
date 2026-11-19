import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/VisualEditor.tsx',import.meta.url),'utf8');
test('dashboard is visible before scene editors',()=>{assert.ok(source.indexOf('Scene preparation dashboard · No charge')<source.indexOf('doc.scenes.map((s:any,i:number)'));});
test('scene links and targets share same stable scene number',()=>{assert.match(source,/href=\{'#storyboard-scene-'\+row.number\}/);assert.match(source,/id=\{'storyboard-scene-'\+\(i\+1\)\}/);});
test('dashboard shows actionable issue counts',()=>{assert.match(source,/row.issues.length\+' item\(s\) to review'/);});
test('dashboard does not imply generation readiness',()=>{assert.match(source,/Provider pricing, image rights and actual generation readiness remain unverified/);});
