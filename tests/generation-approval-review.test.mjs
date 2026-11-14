import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewQueueApproval} from '../lib/cloud/generation-approval-review.mjs';
const proposal={status:'awaiting_explicit_approval',requiresApproval:true,jobCreated:false,providerCalled:false,paymentAuthorized:false,maximumCostCents:500,productionId:'production',projectRevision:5,productionRevision:34};
const revisions={expectedProjectRevision:5,expectedProductionRevision:34};
test('requires explicit human confirmation',()=>assert.throws(()=>reviewQueueApproval(proposal,revisions),/confirmation/));
test('rejects stale revision',()=>assert.throws(()=>reviewQueueApproval(proposal,{...revisions,confirmed:true,expectedProductionRevision:33}),/changed/));
test('rejects altered or unsafe proposal',()=>assert.throws(()=>reviewQueueApproval({...proposal,jobCreated:true},{...revisions,confirmed:true}),/Verified/));
test('approval review never persists or submits a paid job',()=>{const result=reviewQueueApproval(proposal,{...revisions,confirmed:true});assert.equal(result.status,'approval_reviewed_not_submitted');assert.equal(result.persisted,false);assert.equal(result.jobCreated,false);assert.equal(result.paymentAuthorized,false)});
