import test from 'node:test';
import assert from 'node:assert/strict';
import {createProductionFeedStore} from '../lib/cloud/production-feed-store.mjs';
import {loadTrustedProductionFeed} from '../lib/cloud/trusted-production-feed.mjs';
const row={id:'job1',owner_id:'owner1',project_id:'project1',production_id:'prod1',kind:'music',mode:'approval',status:'draft',version:1,spent_cents:0,reserved_cents:0,export_asset_id:null,private_key:'DO_NOT_EXPOSE'};
test('owner-scoped parameterized query returns redacted records',async()=>{
 let called;
 const store=createProductionFeedStore({query:async(sql,params)=>{called={sql,params};return {rows:[row]}}});
 const records=await store.listOwnerWorkflows({ownerId:'owner1',projectId:'project1',limit:5});
 assert.deepEqual(called.params,['owner1','project1',5]);
 assert.match(called.sql,/owner_id = \$1/);assert.match(called.sql,/project_id = \$2/);
 assert.equal(records[0].ownerId,'owner1');assert.equal(JSON.stringify(records).includes('DO_NOT_EXPOSE'),false);
});
test('invalid inputs never invoke query',async()=>{
 let calls=0;const store=createProductionFeedStore({query:async()=>{calls++;return {rows:[]}}});
 await assert.rejects(store.listOwnerWorkflows({ownerId:'owner1',projectId:"x' OR true",limit:5}),/Invalid project/);
 await assert.rejects(store.listOwnerWorkflows({ownerId:'owner1',limit:999}),/Invalid limit/);
 assert.equal(calls,0);
});
test('malformed and oversized responses fail closed',async()=>{
 const store=createProductionFeedStore({query:async()=>({rows:[row,row]})});
 await assert.rejects(store.listOwnerWorkflows({ownerId:'owner1',limit:1}),/Invalid database response/);
});
test('adapter integrates with trusted production projection',async()=>{
 const store=createProductionFeedStore({query:async()=>({rows:[row]})});
 const result=await loadTrustedProductionFeed({actor:{id:'owner1',authenticated:true},ownerId:'owner1',store});
 assert.equal(result.summary.total,1);assert.equal(result.rows[0].capCents,500);
});
test('cross-owner database leakage is rejected by trusted projection',async()=>{
 const store=createProductionFeedStore({query:async()=>({rows:[{...row,owner_id:'intruder'}]})});
 await assert.rejects(loadTrustedProductionFeed({actor:{id:'owner1',authenticated:true},ownerId:'owner1',store}),/Cross-owner/);
});
