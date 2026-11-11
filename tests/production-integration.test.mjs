import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkflow} from '../lib/workflow-automation.mjs';
import {createWorkflowSnapshotWriter} from '../lib/cloud/workflow-snapshot-sync.mjs';
import {createProductionFeedStore} from '../lib/cloud/production-feed-store.mjs';
import {loadTrustedProductionFeed} from '../lib/cloud/trusted-production-feed.mjs';

const owner='11111111-1111-4111-8111-111111111111';
const other='99999999-9999-4999-8999-999999999999';
const project='33333333-3333-4333-8333-333333333333';
const production='44444444-4444-4444-8444-444444444444';
const id='22222222-2222-4222-8222-222222222222';
const actor={id:owner,authenticated:true};
function fixture(){
 const records=new Map();
 const transaction=async callback=>{
  const pending=new Map(records);
  const query=async(sql,args)=>{
   if(sql.includes('FROM public.studio_productions')) return {rows:args[0]===production&&args[1]===owner&&args[2]===project&&args[3]==='music'&&args[4]==='auto'?[{id:production}]:[]};
   if(sql.includes('INSERT INTO public.studio_workflow_snapshots')){
    if(pending.has(args[0]))return {rows:[]};
    pending.set(args[0],{id:args[0],owner_id:args[1],project_id:args[2],production_id:args[3],kind:args[4],mode:args[5],status:args[6],version:args[7],spent_cents:args[8],reserved_cents:args[9],export_asset_id:args[10]});
    return {rows:[{id:args[0]}]};
   }
   if(sql.includes('UPDATE public.studio_workflow_snapshots')){
    const r=pending.get(args[0]);
    if(!r||r.owner_id!==args[1]||r.project_id!==args[2]||r.production_id!==args[3]||r.kind!==args[4]||r.mode!==args[5]||r.version!==args[11])return {rows:[]};
    pending.set(args[0],{...r,status:args[6],version:args[7],spent_cents:args[8],reserved_cents:args[9],export_asset_id:args[10]});
    return {rows:[{id:args[0]}]};
   }
   throw Error('Unexpected transaction query');
  };
  const result=await callback(query);
  records.clear();for(const [k,v] of pending)records.set(k,v);
  return result;
 };
 const query=async(sql,args)=>{
  assert.match(sql,/WHERE owner_id = \$1/);
  const rows=[...records.values()].filter(r=>r.owner_id===args[0]&&(!sql.includes('AND project_id = $2')||r.project_id===args[1]));
  return {rows:rows.slice(0,args.at(-1))};
 };
 return {writer:createWorkflowSnapshotWriter({transaction}),store:createProductionFeedStore({query}),records};
}
const workflow=()=>createWorkflow({id,projectId:project,productionId:production,kind:'music',mode:'automatic'});
const feed=(f,actorArg=actor,projectId=project)=>loadTrustedProductionFeed({actor:actorArg,ownerId:owner,store:f.store,projectId});

test('end-to-end: owner creates snapshot and reads it from trusted feed',async()=>{
 const f=fixture();await f.writer.sync({actor,ownerId:owner,workflow:workflow()});
 const data=await feed(f);
 assert.equal(data.source,'trusted-server');assert.equal(data.readOnly,true);
 assert.equal(data.rows.length,1);assert.equal(data.rows[0].status,'draft');assert.equal(data.rows[0].remainingCents,500);
});
test('end-to-end: versioned workflow updates appear in feed with spending',async()=>{
 const f=fixture();await f.writer.sync({actor,ownerId:owner,workflow:workflow()});
 await f.writer.sync({actor,ownerId:owner,workflow:{...workflow(),version:1,status:'preparing',spentCents:75,reservedCents:100}});
 const data=await feed(f);
 assert.equal(data.rows[0].version,1);assert.equal(data.rows[0].remainingCents,325);
 assert.equal(data.summary.active,1);
});
test('end-to-end: stale update is rejected without corrupting stored record',async()=>{
 const f=fixture();await f.writer.sync({actor,ownerId:owner,workflow:workflow()});
 await assert.rejects(f.writer.sync({actor,ownerId:owner,workflow:{...workflow(),version:2,status:'preparing'}}),/Stale or conflicting/);
 assert.equal((await feed(f)).rows[0].version,0);
});
test('end-to-end: cross-owner read and write are rejected',async()=>{
 const f=fixture();await f.writer.sync({actor,ownerId:owner,workflow:workflow()});
 await assert.rejects(feed(f,{id:other,authenticated:true}),/Not authorized/);
 await assert.rejects(f.writer.sync({actor:{id:other,authenticated:true},ownerId:owner,workflow:workflow()}),/Not authorized/);
 assert.equal(f.records.size,1);
});
test('end-to-end: cross-project filter cannot expose another project',async()=>{
 const f=fixture();await f.writer.sync({actor,ownerId:owner,workflow:workflow()});
 assert.equal((await feed(f,actor,'55555555-5555-4555-8555-555555555555')).rows.length,0);
});
