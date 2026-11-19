import test from 'node:test';import assert from 'node:assert/strict';import {productionBlockerChecklist} from '../lib/production-blocker-checklist.mjs';import {readFileSync} from 'node:fs';
const doc={scenes:[{id:'one',description:'Dance',duration:10,approved:false,characterIds:['xi']},{id:'two',description:'Smile',duration:10,approved:false,characterIds:['xi']}]};
const bible={characters:[{id:'xi',name:'Xi',description:'Curly hair',wardrobe:'Purple jacket'}]};
test('checklist groups repeated issues and scene numbers',()=>{const output=productionBlockerChecklist(doc,bible,[]);assert.match(output,/\[ \] Character: reference image missing/);assert.match(output,/Affected scenes: 1, 2/);});
test('checklist includes approvals and planning-only safety notice',()=>{const output=productionBlockerChecklist(doc,bible,[]);assert.match(output,/Scene approval required/);assert.match(output,/No generation or spending authorized/);});
test('checklist never mutates source storyboard',()=>{const before=JSON.stringify(doc);productionBlockerChecklist(doc,bible,[]);assert.equal(JSON.stringify(doc),before);});
test('UI includes local download control',()=>{const source=readFileSync(new URL('../components/VisualEditor.tsx',import.meta.url),'utf8');assert.match(source,/Production checklist download · No charge/);assert.match(source,/vision-studio-production-checklist.txt/);});
