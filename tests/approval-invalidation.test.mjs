import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {invalidateProjectSceneApprovals,visualBibleChanged} from '../lib/approval-invalidation.mjs';
const bible={projectId:'p',style:'3D',palette:'gold',characters:[],locations:[],updatedAt:'old'};
const productions=[{id:'a',projectId:'p',scenes:[{id:'s1',approved:true},{id:'s2',approved:false}]},{id:'b',projectId:'other',scenes:[{id:'s3',approved:true}]}];
test('visual changes invalidate all approved scenes in selected project only',()=>{
 const next=invalidateProjectSceneApprovals(productions,'p');
 assert.deepEqual(next[0].scenes.map(s=>s.approved),[false,false]);
 assert.equal(next[1],productions[1]);
 assert.equal(productions[0].scenes[0].approved,true);
});
test('metadata timestamp changes do not invalidate approvals',()=>{
 assert.equal(visualBibleChanged(bible,{...bible,updatedAt:'new'}),false);
 assert.equal(visualBibleChanged(bible,{...bible,style:'2D'}),true);
});
test('project mismatch and malformed production are rejected',()=>{
 assert.throws(()=>visualBibleChanged(bible,{...bible,projectId:'other'}));
 assert.throws(()=>invalidateProjectSceneApprovals([{projectId:'p',scenes:null}],'p'));
});
test('Next.js workspace wires visual edits to approval invalidation',()=>{
 const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
 assert.match(source,/visualBibleChanged\(bible,next\)/);
 assert.match(source,/invalidateProjectSceneApprovals\(prev,active\.id\)/);
});
