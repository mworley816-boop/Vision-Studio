import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectBuildReadiness,runBuild} from '../scripts/check-app-build.mjs';
function fixture(fn){const root=mkdtempSync(join(tmpdir(),'vision-build-'));try{mkdirSync(join(root,'app'));writeFileSync(join(root,'app/layout.tsx'),'');writeFileSync(join(root,'app/page.tsx'),'');writeFileSync(join(root,'tsconfig.json'),'{}');writeFileSync(join(root,'package.json'),JSON.stringify({dependencies:{next:'15.3.0'}}));return fn(root)}finally{rmSync(root,{recursive:true,force:true})}}
test('build readiness reports missing app entry files',()=>{const root=mkdtempSync(join(tmpdir(),'vision-build-'));try{assert.ok(inspectBuildReadiness(root).missingFiles.includes('app/page.tsx'))}finally{rmSync(root,{recursive:true,force:true})}});
test('build readiness reports missing packages',()=>fixture(root=>{assert.deepEqual(inspectBuildReadiness(root).missingDependencies,['next'])}));
test('build runner refuses to execute with missing dependencies',()=>fixture(root=>{let called=false;const result=runBuild(root,()=>{called=true});assert.equal(result.status,'blocked');assert.equal(called,false)}));
test('build runner reports success only on zero exit code',()=>fixture(root=>{mkdirSync(join(root,'node_modules/next'),{recursive:true});writeFileSync(join(root,'node_modules/next/package.json'),'{}');assert.equal(runBuild(root,()=>({status:0,stdout:'ok'})).status,'passed');assert.equal(runBuild(root,()=>({status:1,stderr:'compile error'})).status,'failed')}));
