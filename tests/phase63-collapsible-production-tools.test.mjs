import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/VisualEditor.tsx',import.meta.url),'utf8');
for(const label of ['Reusable character continuity briefs','Scene shot plans','Production package export','Production readiness verification','Production blocker summary','Production checklist download'])test(label+' is expandable',()=>{assert.ok(source.includes('<summary style={{cursor:\'pointer\',padding:\'12px 14px\',border:\'1px solid #856b87\',borderRadius:10,fontWeight:600}}>'+label+' · No charge</summary>'));});
test('scene preparation dashboard remains above scene editors',()=>assert.ok(source.indexOf('Scene preparation dashboard · No charge')<source.indexOf('doc.scenes.map((s:any,i:number)')));
test('download actions are retained',()=>{assert.match(source,/vision-studio-production-plan.txt/);assert.match(source,/vision-studio-production-checklist.txt/);});
