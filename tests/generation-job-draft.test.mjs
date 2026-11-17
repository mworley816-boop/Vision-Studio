import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGenerationJobDraft as draft} from '../lib/cloud/generation-job-draft.mjs';
const preview={status:'awaiting_explicit_approval',requiresApproval:true,jobCreated:false,providerCalled:false,paymentAuthorized:false,projectId:'project',productionId:'production',projectRevision:5,productionRevision:34,maximumCostCents:500};
const review={id:'review',decision:'reviewed_only',project_id:'project',production_id:'production',project_revision:5,production_revision:34,maximum_cost_cents:500};
const providerConfiguration={generationEnabled:false,credentialsVerified:true,providerId:'test_provider',estimatedCostCents:350};
const args={preview,review,currentProjectRevision:5,currentProductionRevision:34,requestedMaxCents:500,confirmed:true,providerConfiguration};
test('safe draft is deterministic and never authorizes a job or payment',()=>{const a=draft(args),b=draft(args);assert.deepEqual(a,b);assert.equal(a.status,'draft_ready_only');assert.equal(a.maximumCostCents,500);assert.equal(a.paymentAuthorized,false);assert.equal(a.providerCalled,false);assert.equal(a.jobCreated,false);assert.equal(a.generationEnabled,false);assert.equal(a.requiresSeparatePaidAuthorization,true)});
for(const [name,changes] of [
 ['missing credentials',{providerConfiguration:{...providerConfiguration,credentialsVerified:false}}],
 ['generation switch on',{providerConfiguration:{...providerConfiguration,generationEnabled:true}}],
 ['unknown switch',{providerConfiguration:{...providerConfiguration,generationEnabled:undefined}}],
 ['missing provider',{providerConfiguration:{...providerConfiguration,providerId:''}}],
 ['invalid cost',{providerConfiguration:{...providerConfiguration,estimatedCostCents:0}}],
 ['over budget',{providerConfiguration:{...providerConfiguration,estimatedCostCents:501}}],
 ['missing acknowledgment',{confirmed:false}],
 ['stale revisions',{currentProductionRevision:35}],
 ['missing review',{review:null}],
 ['unverified preview',{preview:{...preview,providerCalled:true}}]
])test('fails closed: '+name,()=>{const r=draft({...args,...changes});assert.equal(r.status,'blocked');assert.equal(r.jobCreated,false);assert.equal(r.providerCalled,false);assert.equal(r.paymentAuthorized,false)});
