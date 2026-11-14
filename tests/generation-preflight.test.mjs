import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCloudGenerationPreflight} from '../lib/cloud/generation-preflight.mjs';
const projectId='11111111-1111-4111-8111-111111111111',productionId='22222222-2222-4222-8222-222222222222';
function mock({bible={characters:[],locations:[]},storyboard={scenes:[]},owner=true}={}){
 const rows={studio_owners:owner?{user_id:'owner'}:null,studio_projects:{visual_bible:bible,revision:2},studio_productions:{storyboard,revision:3,budget_cents:500,kind:'music'}};
 return {auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from(table){return {select(){return this},eq(){return this},async single(){return {data:rows[table],error:null}},async maybeSingle(){return {data:rows[table],error:null}}}}};
}
test('preflight refuses empty storyboard and never enables generation',async()=>{const result=await inspectCloudGenerationPreflight(mock(),{projectId,productionId});assert.equal(result.ready,false);assert.equal(result.generationEnabled,false);assert.equal(result.budgetCapCents,500);});
test('preflight rejects approvals without a visual reference snapshot',async()=>{const result=await inspectCloudGenerationPreflight(mock({storyboard:{scenes:[{id:'s',approved:true,characterIds:[]}]}}),{projectId,productionId});assert.equal(result.ready,false);assert.match(result.issues.join(' '),/reapproval/);});
test('preflight requires owner authorization',async()=>{await assert.rejects(()=>inspectCloudGenerationPreflight(mock({owner:false}),{projectId,productionId}),/owner/);});
