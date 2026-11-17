import test from 'node:test';
import assert from 'node:assert/strict';
import {listProviderPricingResearch} from '../lib/cloud/provider-pricing-research.mjs';
test('research records never impersonate verified provider pricing',()=>{
 const records=listProviderPricingResearch();
 assert.ok(records.length>0);
 for(const r of records){
  assert.equal(r.status,'research_only');
  assert.equal(r.sourceUrl.startsWith('https://'),true);
  assert.equal(Object.hasOwn(r,'verified'),false);
  assert.equal(Object.hasOwn(r,'unitCostCents'),false);
  assert.equal(Object.hasOwn(r,'estimatedCostCents'),false);
 }
});
