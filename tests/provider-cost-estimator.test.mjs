import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateProductionCost} from '../lib/cloud/provider-cost-estimator.mjs';
const nowMs=1500;
const sample={verified:true,sourceUrl:'https://example.com/synthetic',verifiedAtMs:1000,validUntilMs:2000,currency:'USD',billingUnit:'second',unitCostCents:5};
const base={kind:'music',providerId:'example_provider',modelId:'synthetic_v1',sceneCount:5,secondsPerScene:10,nowMs,trustedCatalog:{example_provider:{synthetic_v1:sample}}};
test('synthetic in-budget quote remains planning-only',()=>{
 const r=estimateProductionCost(base);
 assert.equal(r.status,'quote_checked_only');assert.equal(r.estimatedCostCents,250);
 assert.equal(r.generationEnabled,false);assert.equal(r.jobCreated,false);assert.equal(r.providerCalled,false);assert.equal(r.paymentAuthorized,false);
});
test('over-budget production is blocked',()=>{
 const r=estimateProductionCost({...base,sceneCount:20});
 assert.equal(r.status,'blocked');assert.match(r.reason,/budget/i);
});
test('missing catalog is blocked',()=>assert.equal(estimateProductionCost({...base,trustedCatalog:null}).status,'blocked'));
test('expired evidence is blocked',()=>assert.equal(estimateProductionCost({...base,nowMs:2000}).status,'blocked'));
test('unverified evidence is blocked',()=>assert.equal(estimateProductionCost({...base,trustedCatalog:{example_provider:{synthetic_v1:{...sample,verified:false}}}}).status,'blocked'));
test('invalid counts and durations are blocked',()=>{
 for(const args of [{sceneCount:0},{sceneCount:501},{secondsPerScene:0},{secondsPerScene:31},{kind:'other'}])assert.equal(estimateProductionCost({...base,...args}).status,'blocked');
});
test('episode budget is independently enforced',()=>{
 const r=estimateProductionCost({...base,kind:'episode',sceneCount:40});
 assert.equal(r.estimatedCostCents,2000);assert.equal(r.status,'quote_checked_only');
});
