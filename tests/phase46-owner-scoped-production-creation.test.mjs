import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudProduction} from '../lib/cloud/create-production.mjs';
const owner='11111111-1111-4111-8111-111111111111',projectId='22222222-2222-4222-8222-222222222222';
function mock({projectKind='music',projectOwner=owner,enrolled=true,projectMissing=false}={}){
 const inserts=[];
 const db={inserts,auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},from(table){
  const q={select(){return this},eq(){return this},insert(value){inserts.push({table,value});return this},async maybeSingle(){
   if(table==='studio_owners')return {data:enrolled?{user_id:owner}:null,error:null};
   return {data:projectMissing?null:{id:projectId,owner_id:projectOwner,kind:projectKind},error:null};
  },async single(){return {data:{id:'created',...inserts.at(-1)?.value},error:null}}};
  return q;
 }};
 return db;
}
test('music creation derives $5 cap and authenticated owner',async()=>{
 const db=mock();const r=await createCloudProduction(db,{projectId,title:' Music ',kind:'music'});
 assert.equal(r.budget_cents,500);assert.equal(db.inserts.length,1);assert.equal(db.inserts[0].value.owner_id,owner);
});
test('episode creation derives $20 cap from series project',async()=>{
 const db=mock({projectKind:'series'});const r=await createCloudProduction(db,{projectId,title:'Episode',kind:'episode'});
 assert.equal(r.budget_cents,2000);
});
test('wrong kind, foreign project, missing project and unenrolled user never write',async()=>{
 for(const opts of [{projectKind:'series'},{projectOwner:'33333333-3333-4333-8333-333333333333'},{projectMissing:true},{enrolled:false}]){
  const db=mock(opts);await assert.rejects(createCloudProduction(db,{projectId,title:'Video',kind:'music'}));assert.equal(db.inserts.length,0);
 }
});
test('invalid input never writes',async()=>{
 for(const change of [{projectId:'bad'},{title:' '},{kind:'episode'},{title:'x'.repeat(161)}]){
  const db=mock();await assert.rejects(createCloudProduction(db,{projectId,title:'Video',kind:'music',...change}));assert.equal(db.inserts.length,0);
 }
});
