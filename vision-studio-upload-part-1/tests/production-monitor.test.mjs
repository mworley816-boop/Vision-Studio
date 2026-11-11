import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkflow,advanceWorkflow,reserveWorkflowJob} from '../lib/workflow-automation.mjs';
import {monitorWorkflows,productionSummary} from '../lib/production-monitor.mjs';
const make=(id,kind='music',mode='approval')=>createWorkflow({id,projectId:'project-1',productionId:`production-${id}`,kind,mode});
test('monitor shows approval checkpoints',()=>{
 const w=advanceWorkflow(make('a'),'submit');const row=monitorWorkflows([w])[0];
 assert.equal(row.needsApproval,true);assert.match(row.nextStep,/Approve storyboard/);
});
test('monitor tracks production spending and reservations',()=>{
 const w=reserveWorkflowJob(advanceWorkflow(make('a','episode','automatic'),'submit'),{jobId:'job-1',maxCents:75});
 const row=monitorWorkflows([w])[0];assert.equal(row.capCents,2000);assert.equal(row.remainingCents,1925);
});
test('monitor isolates projects and filters status',()=>{
 const a=make('a'),b={...make('b'),projectId:'project-2'};
 assert.equal(monitorWorkflows([a,b],{projectId:'project-1'}).length,1);
 assert.equal(monitorWorkflows([a,b],{status:'complete'}).length,0);
});
test('summary counts approval, failed and completed',()=>{
 const a=monitorWorkflows([advanceWorkflow(make('a'),'submit')])[0];
 const b=monitorWorkflows([advanceWorkflow(make('b'),'fail')])[0];
 const c={...a,id:'c',status:'complete',needsApproval:false,hasError:false};
 assert.deepEqual(productionSummary([a,b,c]),{total:3,active:0,awaitingApproval:1,failed:1,completed:1});
});
test('invalid budget and status fail closed',()=>{
 assert.throws(()=>monitorWorkflows([{...make('a'),spentCents:9999}]),/Invalid budget/);
 assert.throws(()=>monitorWorkflows([],{status:'invalid'}),/Unknown status/);
});
