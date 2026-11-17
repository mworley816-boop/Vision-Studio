import test from 'node:test';
import assert from 'node:assert/strict';
import {productionIdIsValid,mayInspectProduction} from '../lib/cloud/ledger-access.mjs';
const id='123e4567-e89b-42d3-a456-426614174000';
const other='123e4567-e89b-42d3-a456-426614174001';
const owner='owner-1';
test('production identifier validation rejects missing, malformed and non-UUID input',()=>{
 for(const bad of [null,undefined,'',42,'../etc/passwd','not-a-uuid',id+'extra'])assert.equal(productionIdIsValid(bad),false);
 assert.equal(productionIdIsValid(id),true);
});
test('only matching authenticated owner and requested production may inspect',()=>{
 const valid={userId:owner,production:{id,owner_id:owner},requestedProductionId:id};
 assert.equal(mayInspectProduction(valid),true);
 assert.equal(mayInspectProduction({...valid,userId:undefined}),false);
 assert.equal(mayInspectProduction({...valid,userId:'other-owner'}),false);
 assert.equal(mayInspectProduction({...valid,production:null}),false);
 assert.equal(mayInspectProduction({...valid,production:{id:other,owner_id:owner}}),false);
 assert.equal(mayInspectProduction({...valid,requestedProductionId:other}),false);
 assert.equal(mayInspectProduction({...valid,production:{id}}),false);
});
