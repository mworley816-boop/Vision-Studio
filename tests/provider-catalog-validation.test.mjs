import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectProviderCatalogEntry as inspect} from '../lib/cloud/provider-catalog-validation.mjs';
const entry={verified:true,sourceUrl:'https://example.com/pricing',verifiedAtMs:1000,validUntilMs:2000,currency:'USD',billingUnit:'second',unitCostCents:5,capabilities:['video']};
const args={providerId:'example_provider',modelId:'synthetic_v1',entry,nowMs:1500};
test('synthetic evidence passes structural checks only; cannot authorize generation',()=>{
 const r=inspect(args);assert.equal(r.status,'evidence_structurally_valid_only');assert.equal(r.requiresIndependentVerification,true);
 assert.equal(r.generationEnabled,false);assert.equal(r.providerCalled,false);assert.equal(r.jobCreated,false);assert.equal(r.paymentAuthorized,false);
});
for(const [name,changes] of [
 ['missing entry',{entry:null}],['unverified',{entry:{...entry,verified:false}}],
 ['expired',{nowMs:2000}],['future verification',{nowMs:999}],
 ['non-USD',{entry:{...entry,currency:'EUR'}}],['wrong unit',{entry:{...entry,billingUnit:'minute'}}],
 ['invalid cost',{entry:{...entry,unitCostCents:0}}],['missing video',{entry:{...entry,capabilities:['audio']}}],
 ['insecure URL',{entry:{...entry,sourceUrl:'http://example.com'}}],['credential URL',{entry:{...entry,sourceUrl:'https://user:pass@example.com/pricing'}}],
 ['invalid provider',{providerId:'../secret'}]
])test('fails closed: '+name,()=>{const r=inspect({...args,...changes});assert.equal(r.status,'blocked');assert.equal(r.paymentAuthorized,false);assert.equal(r.jobCreated,false)});
