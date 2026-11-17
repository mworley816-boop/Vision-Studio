import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGenerationAuthorizationReadiness as evaluate} from '../lib/cloud/generation-authorization-readiness.mjs';
const preview={status:'awaiting_explicit_approval',requiresApproval:true,jobCreated:false,providerCalled:false,paymentAuthorized:false,projectId:'project',productionId:'production',projectRevision:5,productionRevision:34,maximumCostCents:500};
const review={id:'review',decision:'reviewed_only',project_id:'project',production_id:'production',project_revision:5,production_revision:34,maximum_cost_cents:500};
const input={preview,review,currentProjectRevision:5,currentProductionRevision:34,requestedMaxCents:500,confirmed:true};
test('passing planning checks never authorizes payment or starts work',()=>{const r=evaluate(input);assert.equal(r.status,'planning_checks_passed_only');assert.equal(r.requiresSeparatePaidAuthorization,true);assert.equal(r.paymentAuthorized,false);assert.equal(r.jobCreated,false);assert.equal(r.providerCalled,false);assert.equal(r.generationEnabled,false)});
for(const [name,changes] of [
 ['missing review',{review:null}],['unpersisted review',{review:{...review,id:''}}],['changed storyboard',{currentProductionRevision:35}],['changed visual bible',{currentProjectRevision:6}],['wrong production',{review:{...review,production_id:'other'}}],['wrong budget',{requestedMaxCents:501}],['budget above ceiling',{requestedMaxCents:2001}],['unconfirmed',{confirmed:false}],['already queued',{preview:{...preview,jobCreated:true}}],['paid preview',{preview:{...preview,paymentAuthorized:true}}],['duplicate mismatched review',{review:{...review,maximum_cost_cents:499}}]
])test('blocks '+name,()=>{const r=evaluate({...input,...changes});assert.equal(r.status,'blocked');assert.equal(r.paymentAuthorized,false);assert.equal(r.jobCreated,false)});
