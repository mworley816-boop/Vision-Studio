import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkflow,advanceWorkflow,reserveWorkflowJob,reconcileWorkflowJob,workflowNextStep} from '../lib/workflow-automation.mjs';
const make=(kind='episode',mode='approval')=>createWorkflow({id:'w1',projectId:'p1',productionId:'v1',kind,mode});
test('approval checkpoints block unapproved storyboard, assets and export',()=>{
 let w=advanceWorkflow(make(),'submit');
 assert.equal(w.status,'awaiting_storyboard_approval');
 assert.throws(()=>advanceWorkflow(w,'approve_storyboard'),/approval/);
 w=advanceWorkflow(w,'approve_storyboard',{allScenesApproved:true});
 assert.throws(()=>advanceWorkflow(w,'assets_ready'),/Verified assets/);
 w=advanceWorkflow(w,'assets_ready',{assetsVerified:true});
 assert.equal(w.status,'awaiting_asset_approval');
 w=advanceWorkflow(w,'approve_assets',{assetsVerified:true});
 w=advanceWorkflow(w,'start_render');
 assert.throws(()=>advanceWorkflow(w,'render_succeeded'),/Verified export/);
 w=advanceWorkflow(w,'render_succeeded',{verifiedExport:true,assetId:'private-export'});
 assert.equal(w.status,'awaiting_export_approval');
 w=advanceWorkflow(w,'approve_export');assert.equal(w.status,'complete');
});
test('automatic workflow skips approval checkpoints but requires verified assets and export',()=>{
 let w=advanceWorkflow(make('music','automatic'),'submit');
 assert.equal(w.status,'preparing');
 w=advanceWorkflow(w,'assets_ready',{assetsVerified:true});
 w=advanceWorkflow(w,'start_render');
 w=advanceWorkflow(w,'render_succeeded',{verifiedExport:true,assetId:'export'});
 assert.equal(w.status,'complete');
});
test('episode hard cap $20 and music video hard cap $5',()=>{
 for(const [kind,limit] of [['episode',2000],['music',500]]){
  let w=advanceWorkflow(make(kind,'automatic'),'submit');
  w=reserveWorkflowJob(w,{jobId:'job',maxCents:limit});
  assert.throws(()=>reserveWorkflowJob(w,{jobId:'another',maxCents:1}),/hard cap/);
  w=reconcileWorkflowJob(w,{jobId:'job',maxCents:limit,actualCents:limit-10});
  assert.equal(w.reservedCents,0);assert.equal(w.spentCents,limit-10);
 }
});
test('stale version and duplicate job rejected',()=>{
 let w=advanceWorkflow(make('music','automatic'),'submit');
 assert.throws(()=>reserveWorkflowJob(w,{jobId:'a',maxCents:1,expectedVersion:0}),/Stale/);
 w=reserveWorkflowJob(w,{jobId:'a',maxCents:1,expectedVersion:w.version});
 assert.throws(()=>reserveWorkflowJob(w,{jobId:'a',maxCents:1}),/duplicate/);
});
test('unsettled reservations block rendering and cancellation',()=>{
 let w=advanceWorkflow(make('music','automatic'),'submit');
 w=reserveWorkflowJob(w,{jobId:'a',maxCents:1});
 assert.throws(()=>advanceWorkflow(w,'assets_ready',{assetsVerified:true}),/Outstanding/);
 assert.throws(()=>advanceWorkflow(w,'cancel'),/reservations/);
});
test('reconciliation cannot exceed reserved amount or settle twice',()=>{
 let w=advanceWorkflow(make('music','automatic'),'submit');
 w=reserveWorkflowJob(w,{jobId:'a',maxCents:5});
 assert.throws(()=>reconcileWorkflowJob(w,{jobId:'a',maxCents:5,actualCents:6}),/exceeds/);
 w=reconcileWorkflowJob(w,{jobId:'a',maxCents:5,actualCents:4});
 assert.throws(()=>reconcileWorkflowJob(w,{jobId:'a',maxCents:5,actualCents:4}),/settled/);
});
test('next step and failure retry',()=>{
 let w=advanceWorkflow(make('music','automatic'),'submit');
 w=advanceWorkflow(w,'fail');assert.match(workflowNextStep(w),/retry/);
 w=advanceWorkflow(w,'retry');assert.equal(w.status,'preparing');
});
