import test from 'node:test';import assert from 'node:assert/strict';import {previewProviderEvidence} from '../lib/cloud/provider-evidence-preview.mjs';
const now=Date.parse('2026-11-19T12:00:00Z');
const input={providerId:'runway',modelId:'gen-4-5',sourceUrl:'https://dev.runwayml.com/pricing',unitCostCents:'5',validUntil:'2026-12-01T00:00:00Z'};
test('complete quote fields only pass structural preview',()=>{const result=previewProviderEvidence(input,now);assert.equal(result.status,'unverified_evidence_preview');assert.equal(result.trustedProviderPricing,false);assert.equal(result.generationEnabled,false);});
test('invalid quote URLs are rejected',()=>assert.equal(previewProviderEvidence({...input,sourceUrl:'http://invalid.example'},now).status,'blocked'));
test('expired evidence is rejected',()=>assert.equal(previewProviderEvidence({...input,validUntil:'2026-11-18T00:00:00Z'},now).status,'blocked'));
test('invalid unit rate is rejected',()=>assert.equal(previewProviderEvidence({...input,unitCostCents:'0'},now).status,'blocked'));
