import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkflow} from '../lib/workflow-automation.mjs';
import {workflowSnapshot,createWorkflowSnapshotWriter} from '../lib/cloud/workflow-snapshot-sync.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
const project='33333333-3333-4333-8333-333333333333';
const production='44444444-4444-4444-8444-444444444444';
const base=()=>createWorkflow({id,projectId:project,productionId:production,kind:'music',mode:'automatic'});
test('maps automatic mode and validates budget and identifiers',()=>{
 const snapshot=workflowSnapshot({workflow:base(),ownerId:owner});
 assert.equal(snapshot.mode,'auto');assert.equal(snapshot.version,0);
 assert.throws(()=>workflowSnapshot({workflow:{...base(),spentCents:501},ownerId:owner}),/cap/);
 assert.throws(()=>workflowSnapshot({workflow:{...base(),id:'not-uuid'},ownerId:owner}),/Invalid id/);
});
test('rejects unauthenticated owner without starting transaction',async()=>{
 let count=0;const writer=createWorkflowSnapshotWriter({transaction:async()=>{count++;}});
 await assert.rejects(writer.sync({actor:{id:owner,authenticated:false},ownerId:owner,workflow:base()}),/Not authorized/);
 assert.equal(count,0);
});
test('initial snapshot uses conflict-safe insert and ownership lock',async()=>{
 const calls=[];
 const writer=createWorkflowSnapshotWriter({transaction:async fn=>fn(async(sql,args)=>{
  calls.push({sql,args});return {rows:[{id}]};
 })});
 assert.deepEqual(await writer.sync({actor:{id:owner,authenticated:true},ownerId:owner,workflow:base()}),{id,version:0,synced:true});
 assert.match(calls[0].sql,/FOR UPDATE/);assert.match(calls[1].sql,/ON CONFLICT DO NOTHING/);
});
test('updates require previous version and fail closed on conflicts',async()=>{
 const calls=[];
 const writer=createWorkflowSnapshotWriter({transaction:async fn=>fn(async(sql,args)=>{
  calls.push({sql,args});return calls.length===1?{rows:[{id}]}:{rows:[]};
 })});
 await assert.rejects(writer.sync({actor:{id:owner,authenticated:true},ownerId:owner,workflow:{...base(),version:2,status:'preparing'}}),/Stale or conflicting/);
 assert.match(calls[1].sql,/version=\$12/);assert.equal(calls[1].args[11],1);
});
test('rejects cross-project production before mutation',async()=>{
 let calls=0;
 const writer=createWorkflowSnapshotWriter({transaction:async fn=>fn(async()=>{calls++;return {rows:[]};})});
 await assert.rejects(writer.sync({actor:{id:owner,authenticated:true},ownerId:owner,workflow:base()}),/ownership mismatch/);
 assert.equal(calls,1);
});
