import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectAppModuleGraph} from '../scripts/check-app-module-graph.mjs';
function fixture(fn){const root=mkdtempSync(join(tmpdir(),'vision-module-'));mkdirSync(join(root,'app'));try{fn(root);}finally{rmSync(root,{recursive:true,force:true});}}
test('Phase 61 checks actual application module graph',()=>{const r=inspectAppModuleGraph(process.cwd());assert.equal(r.status,'passed',JSON.stringify(r.issues));assert.ok(r.filesChecked>=13);});
test('Phase 61 accepts valid re-exports and dynamic local imports',()=>fixture(root=>{writeFileSync(join(root,'app','a.ts'),"export * from './b.mjs'; async function load(){return import('./b.mjs')}");writeFileSync(join(root,'app','b.mjs'),'export const x=1;');assert.equal(inspectAppModuleGraph(root).status,'passed');}));
test('Phase 61 rejects missing re-export targets',()=>fixture(root=>{writeFileSync(join(root,'app','a.ts'),"export {x} from './missing.mjs';");const r=inspectAppModuleGraph(root);assert.equal(r.status,'failed');assert.equal(r.issues[0].code,'MISSING_LOCAL_MODULE');}));
test('Phase 61 rejects missing dynamic import targets',()=>fixture(root=>{writeFileSync(join(root,'app','a.ts'),"async function load(){return import('./absent.js')}");assert.equal(inspectAppModuleGraph(root).status,'failed');}));
