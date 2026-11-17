import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectProductionBudget as inspect} from '../lib/cloud/production-budget-plan.mjs';
const base={kind:'music',videoClipCents:50,clipCount:5,retryCount:1,imageAssetCents:50,audioCents:60,otherCents:40};
test('full budget includes video retries, assets, audio and overhead',()=>{
 const r=inspect(base);assert.equal(r.status,'budget_checked_only');assert.equal(r.estimatedCostCents,450);assert.equal(r.remainingAfterEstimateCents,50);assert.equal(r.paymentAuthorized,false);
});
test('retries can push a production over budget',()=>assert.equal(inspect({...base,retryCount:3}).status,'blocked'));
test('missing non-video cost fails closed',()=>assert.equal(inspect({...base,audioCents:undefined}).status,'blocked'));
test('existing commitments reduce remaining budget',()=>assert.equal(inspect({...base,reservedCents:60}).status,'blocked'));
test('episode has separate $20 cap',()=>assert.equal(inspect({...base,kind:'episode',clipCount:20,retryCount:0}).status,'budget_checked_only'));
test('negative and fractional amounts fail closed',()=>{
 for(const changes of [{videoClipCents:-1},{audioCents:0.5},{retryCount:-1},{spentCents:-1}])assert.equal(inspect({...base,...changes}).status,'blocked');
});
