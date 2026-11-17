import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectTrustedProviderQuote as check} from '../lib/cloud/trusted-provider-quote.mjs';
const providerId='example_provider',modelId='video_v1',nowMs=1500;
const trustedCatalog={example_provider:{video_v1:{verified:true,sourceUrl:'https://example.com/pricing',verifiedAtMs:1000,validUntilMs:2000,estimatedCostCents:450,currency:'USD'}}};
const quote={providerId,modelId,estimatedCostCents:450,currency:'USD',expiresAtMs:2000};
const args={providerId,modelId,nowMs,requestedMaxCents:500,quote,trustedCatalog};
test('trusted in-budget quote is planning-only',()=>{const r=check(args);assert.equal(r.status,'quote_checked_only');assert.equal(r.providerCalled,false);assert.equal(r.paymentAuthorized,false);assert.equal(r.jobCreated,false)});
for(const [name,changes] of [
 ['no trusted catalog',{trustedCatalog:null}],
 ['unknown model',{modelId:'other'}],
 ['client verified flag cannot substitute for trusted evidence',{trustedCatalog:{},quote:{...quote,verified:true}}],
 ['expired source',{nowMs:2000}],
 ['mismatched quote',{quote:{...quote,estimatedCostCents:100}}],
 ['over budget',{requestedMaxCents:400}],
 ['unverified source',{trustedCatalog:{example_provider:{video_v1:{...trustedCatalog.example_provider.video_v1,verified:false}}}}],
 ['missing source URL',{trustedCatalog:{example_provider:{video_v1:{...trustedCatalog.example_provider.video_v1,sourceUrl:''}}}}],
 ['non-USD trusted quote',{trustedCatalog:{example_provider:{video_v1:{...trustedCatalog.example_provider.video_v1,currency:'EUR'}}}}],
])test('fails closed: '+name,()=>{const r=check({...args,...changes});assert.equal(r.status,'blocked');assert.equal(r.paymentAuthorized,false);assert.equal(r.providerCalled,false);assert.equal(r.jobCreated,false)});
