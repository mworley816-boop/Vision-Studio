import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectProviderQuote as check} from '../lib/cloud/provider-quote-check.mjs';
const quote={verified:true,providerId:'example_provider',modelId:'video_v1',estimatedCostCents:450,currency:'USD',checkedAtMs:1000,currentTimeMs:1500,expiresAtMs:2000};
const args={providerId:'example_provider',modelId:'video_v1',quote,requestedMaxCents:500,generationEnabled:false};
test('verified in-budget quote is planning only',()=>{const r=check(args);assert.equal(r.status,'quote_checked_only');assert.equal(r.paymentAuthorized,false);assert.equal(r.providerCalled,false);assert.equal(r.jobCreated,false);assert.equal(r.generationEnabled,false)});
for(const [name,changes] of [
 ['missing provider',{providerId:''}],['wrong model',{modelId:'different'}],['unverified quote',{quote:{...quote,verified:false}}],['provider mismatch',{quote:{...quote,providerId:'other'}}],['quote over cap',{quote:{...quote,estimatedCostCents:501}}],['expired quote',{quote:{...quote,currentTimeMs:2000}}],['missing expiry',{quote:{...quote,expiresAtMs:null}}],['future checked time',{quote:{...quote,currentTimeMs:900}}],['invalid currency',{quote:{...quote,currency:'EUR'}}],['generation enabled',{generationEnabled:true}],['missing quote',{quote:null}]
])test('fails closed: '+name,()=>{const r=check({...args,...changes});assert.equal(r.status,'blocked');assert.equal(r.paymentAuthorized,false);assert.equal(r.jobCreated,false)});
