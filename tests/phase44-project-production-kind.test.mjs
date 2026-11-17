import test from 'node:test';
import assert from 'node:assert/strict';
import {projectProductionKindsMatch} from '../lib/cloud/project-production-kind.mjs';
import {inspectCloudGenerationPreflight} from '../lib/cloud/generation-preflight.mjs';
test('only matching project-production pairs are valid',()=>{
 for(const [project,production,expected] of [['music','music',true],['series','episode',true],['music','episode',false],['series','music',false],['other','music',false],['music','other',false]])assert.equal(projectProductionKindsMatch(project,production),expected);
});
test('read-only preflight blocks a cross-kind production even when budget matches',async()=>{
 const client={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from(table){
 const data={studio_owners:{user_id:'owner'},studio_projects:{kind:'series',visual_bible:{characters:[],locations:[]},revision:1},studio_productions:{kind:'music',budget_cents:500,storyboard:{scenes:[]},revision:1}}[table];
 return {select(){return this},eq(){return this},single:async()=>({data,error:null}),maybeSingle:async()=>({data,error:null})};
 }};
 const result=await inspectCloudGenerationPreflight(client,{projectId:'project',productionId:'production'});
 assert.equal(result.ready,false);
 assert.equal(result.generationEnabled,false);
 assert.match(result.issues.join(' '),/Project type and production type do not match/);
});
