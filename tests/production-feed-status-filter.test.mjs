import test from 'node:test';
import assert from 'node:assert/strict';
import {createProductionFeedStore} from '../lib/cloud/production-feed-store.mjs';
import {executeProductionFeedQuery} from '../lib/cloud/production-feed-request.mjs';

function clientSpy(){const calls=[];const chain={select(){return this},eq(k,v){calls.push([k,v]);return this},order(){return this},async limit(n){calls.push(['limit',n]);return {data:[],error:null}}};return {calls,client:{from(){return chain}}};}
for(const filters of [{},{projectId:'project1'},{status:'queued'},{projectId:'project1',status:'queued'}]){
 test(`status/project filters apply in database before limit: ${JSON.stringify(filters)}`,async()=>{
  const {calls,client}=clientSpy();const store=createProductionFeedStore({query:(sql,params)=>executeProductionFeedQuery(client,params,sql)});
  await store.listOwnerWorkflows({ownerId:'owner1',...filters,limit:2});
  assert.deepEqual(calls,[['owner_id','owner1'],...(filters.projectId?[['project_id',filters.projectId]]:[]),...(filters.status?[['status',filters.status]]:[]),['limit',2]]);
 });
}
