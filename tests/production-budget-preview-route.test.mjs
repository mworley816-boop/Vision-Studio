import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectProductionBudget} from '../lib/cloud/production-budget-plan.mjs';
test('server validator blocks unknown costs and protects the cap',()=>{
 const args={kind:'music',videoClipCents:50,clipCount:5,retryCount:1,imageAssetCents:50,audioCents:60,otherCents:40,spentCents:0,reservedCents:0};
 const ok=inspectProductionBudget(args);
 assert.equal(ok.status,'budget_checked_only');assert.equal(ok.paymentAuthorized,false);
 assert.equal(inspectProductionBudget({...args,otherCents:undefined}).status,'blocked');
 assert.equal(inspectProductionBudget({...args,otherCents:100}).status,'blocked');
});
