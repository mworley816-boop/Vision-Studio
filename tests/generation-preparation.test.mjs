import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCloudGeneration} from '../lib/cloud/generation-preparation.mjs';
const projectId='11111111-1111-4111-8111-111111111111',productionId='22222222-2222-4222-8222-222222222222';
function mock({approved=true,budget=500}={}){
 const scene={id:'scene',approved,characterIds:[],locationId:'',referenceSnapshot:{characters:[],locationId:'',locationReferenceAssetId:'',sceneReferenceAssetId:''}};
 const rows={studio_owners:{user_id:'owner'},studio_projects:{kind:'music',visual_bible:{characters:[],locations:[]},revision:2},studio_productions:{storyboard:{scenes:[scene]},revision:3,budget_cents:budget,kind:'music'}};
 return {auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from(table){return {select(){return this},eq(){return this},async single(){return {data:rows[table],error:null}},async maybeSingle(){return {data:rows[table],error:null}}}}};
}
const args={projectId,productionId,projectRevision:2,productionRevision:3,requestedMaxCents:500};
test('ready preparation never creates reservation or enables paid generation',async()=>{const result=await prepareCloudGeneration(mock(),args);assert.equal(result.status,'planning_only');assert.equal(result.reservationCreated,false);assert.equal(result.generationEnabled,false);});
test('rejects stale production revision',async()=>{await assert.rejects(()=>prepareCloudGeneration(mock(),{...args,productionRevision:2}),/changed/);});
test('rejects costs over budget',async()=>{await assert.rejects(()=>prepareCloudGeneration(mock(),{...args,requestedMaxCents:501}),/budget/);});
test('rejects unapproved scenes',async()=>{await assert.rejects(()=>prepareCloudGeneration(mock({approved:false}),args),/not ready/);});
test('requires positive amount and revisions',async()=>{await assert.rejects(()=>prepareCloudGeneration(mock(),{...args,requestedMaxCents:0}),/Positive/);await assert.rejects(()=>prepareCloudGeneration(mock(),{...args,projectRevision:-1}),/revision/);});
