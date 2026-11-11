import test from 'node:test';
import assert from 'node:assert/strict';
import {createProduction,addScene,approveScene} from '../lib/workspace.mjs';
const draft=()=>createProduction('project','music','Test production','production');
test('scene creation rejects missing identifiers',()=>assert.throws(()=>addScene(draft(),{description:'Shot'}),/Scene ID required/));
test('scene creation rejects duplicate identifiers',()=>{const p=addScene(draft(),{id:'scene-1',description:'Shot'});assert.throws(()=>addScene(p,{id:'scene-1',description:'Different shot'}),/Duplicate scene ID/)});
test('scene approval rejects unknown scene',()=>assert.throws(()=>approveScene(draft(),'missing',true),/Scene not found/));
test('scene approval rejects non-boolean decisions',()=>{const p=addScene(draft(),{id:'scene-1',description:'Shot'});assert.throws(()=>approveScene(p,'scene-1','yes'),/Approval must be boolean/)});
test('scene approval rejects completed production',()=>{const p={...addScene(draft(),{id:'scene-1',description:'Shot'}),status:'complete'};assert.throws(()=>approveScene(p,'scene-1',true),/locked/)});
