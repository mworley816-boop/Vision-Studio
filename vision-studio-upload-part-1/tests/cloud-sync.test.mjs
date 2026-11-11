import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDocument,saveVisualBible,saveStoryboard} from '../lib/cloud/studio-cloud.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const project='22222222-2222-4222-8222-222222222222';
const production='33333333-3333-4333-8333-333333333333';
function fake({match=true}={}) {
 const calls=[];
 const client={auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},from(table){
  if(table==='studio_owners')return {select(){return {eq(){return {maybeSingle:async()=>({data:{user_id:owner}})}}}}};
  return {update(payload){calls.push({table,payload});return {eq(){return this},select(){return {maybeSingle:async()=>({data:match?{revision:payload.revision}:null,error:null})}}}}};
 }};return {client,calls};
}
test('validates scene duration',()=>{assert.throws(()=>validateDocument({scenes:[{description:'x',duration:0}]},'storyboard'));assert.doesNotThrow(()=>validateDocument({scenes:[{description:'x',duration:12}]},'storyboard'))});
test('rejects arrays as visual bible',()=>assert.throws(()=>validateDocument([],'bible')));
test('saves project revision',async()=>{const {client,calls}=fake();assert.deepEqual(await saveVisualBible(client,{projectId:project,visualBible:{palette:'plum'},revision:2}),{revision:3});assert.equal(calls[0].payload.revision,3)});
test('detects concurrent project changes',async()=>{const {client}=fake({match:false});await assert.rejects(saveVisualBible(client,{projectId:project,visualBible:{},revision:1}),/changed elsewhere/)});
test('saves storyboard with revision',async()=>{const {client,calls}=fake();await saveStoryboard(client,{projectId:project,productionId:production,storyboard:{scenes:[]},revision:0});assert.equal(calls[0].payload.revision,1)});
test('rejects invalid revisions',async()=>{const {client}=fake();await assert.rejects(saveStoryboard(client,{projectId:project,productionId:production,storyboard:{scenes:[]},revision:-1}),/revision/)});
