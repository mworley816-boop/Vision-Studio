import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectTypeScriptSource,loadTypeScript} from '../scripts/check-typescript-source.mjs';
const ts=loadTypeScript();
function fixture(fn){const root=mkdtempSync(join(tmpdir(),'vision-ts-'));mkdirSync(join(root,'app'));try{return fn(root)}finally{rmSync(root,{recursive:true,force:true})}}
test('TypeScript syntax checker parses TSX without application dependencies',()=>fixture(root=>{writeFileSync(join(root,'app','page.tsx'),'export default function Page(){return <main>Ready</main>}');const result=inspectTypeScriptSource(root,ts);assert.equal(result.status,'passed');assert.equal(result.filesChecked,1)}));
test('TypeScript syntax checker reports invalid TSX',()=>fixture(root=>{writeFileSync(join(root,'app','page.tsx'),'export default function Page( { return <main/> }');const result=inspectTypeScriptSource(root,ts);assert.equal(result.status,'failed');assert.ok(result.issues.some(x=>typeof x.line==='number'))}));
test('TypeScript syntax checker detects missing relative imports',()=>fixture(root=>{writeFileSync(join(root,'app','page.tsx'),"import x from './missing.mjs'; export default x");const result=inspectTypeScriptSource(root,ts);assert.equal(result.status,'failed');assert.ok(result.issues.some(x=>x.code==='MISSING_RELATIVE_IMPORT'))}));
test('TypeScript syntax checker accepts existing relative imports',()=>fixture(root=>{writeFileSync(join(root,'app','util.mjs'),'export default 1');writeFileSync(join(root,'app','page.tsx'),"import x from './util.mjs'; export default x");assert.equal(inspectTypeScriptSource(root,ts).status,'passed')}));
