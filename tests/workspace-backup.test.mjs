import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceBackup,parseWorkspaceBackup} from '../preview/workspace-backup.mjs';
import {createBackup} from '../preview/backup.mjs';
import {createProduction,addScene,approveScene} from '../lib/workspace.mjs';
const projects=[{id:'p1',name:'Series',kind:'episode',mode:'approval'}];
const production=approveScene(addScene(createProduction('p1','episode','Pilot','prod1'),{id:'scene1',description:'Opening'}),'scene1',true);
test('full backup round trip retains scenes and approvals',()=>{const backup=createWorkspaceBackup(projects,[production]);const restored=parseWorkspaceBackup(JSON.stringify(backup));assert.equal(restored.productions[0].scenes[0].approved,true);assert.equal(restored.productions[0].scenes[0].description,'Opening');assert.equal(restored.legacy,false);});
test('legacy project-only backup imports without scenes',()=>{const result=parseWorkspaceBackup(JSON.stringify(createBackup(projects)));assert.equal(result.legacy,true);assert.deepEqual(result.productions,[]);});
test('backup rejects orphaned productions',()=>assert.throws(()=>createWorkspaceBackup(projects,[{...production,projectId:'unknown'}]),/ownership/));
test('backup rejects duplicate scene IDs',()=>assert.throws(()=>parseWorkspaceBackup(JSON.stringify({...createWorkspaceBackup(projects,[production]),productions:[{...production,scenes:[production.scenes[0],production.scenes[0]]}]})),/scene/));
test('backup rejects tampered spending values',()=>assert.throws(()=>parseWorkspaceBackup(JSON.stringify({...createWorkspaceBackup(projects,[production]),productions:[{...production,spentCents:100}]})),/production/));
test('backup rejects unsupported format',()=>assert.throws(()=>parseWorkspaceBackup('{"format":"other"}'),/Unsupported/));

test('backup rejects production type mismatched with owning project',()=>{const wrong={...production,kind:'music'};assert.throws(()=>createWorkspaceBackup(projects,[wrong]),/production/);});
test('import rejects production type tampering',()=>{const original=createWorkspaceBackup(projects,[production]);assert.throws(()=>parseWorkspaceBackup(JSON.stringify({...original,productions:[{...production,kind:'music'}]})),/production/);});
