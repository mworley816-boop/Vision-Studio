/** Phase 13: fail-closed, non-spending authorization readiness evaluation.
 * An acknowledged review is evidence of review only, never permission to spend.
 * This function performs no network, database writes, provider calls or job submission.
 */
export function evaluateGenerationAuthorizationReadiness({preview,review,currentProjectRevision,currentProductionRevision,confirmed=false,requestedMaxCents}={}){
 const fail=(reason)=>Object.freeze({status:'blocked',reason,jobCreated:false,providerCalled:false,paymentAuthorized:false,generationEnabled:false});
 if(!preview||preview.status!=='awaiting_explicit_approval'||preview.requiresApproval!==true||preview.jobCreated!==false||preview.providerCalled!==false||preview.paymentAuthorized!==false)return fail('Verified queue preview required');
 if(!review||review.decision!=='reviewed_only'||typeof review.id!=='string'||!review.id)return fail('Persisted review required');
 if(!Number.isSafeInteger(requestedMaxCents)||requestedMaxCents<1||requestedMaxCents>2000)return fail('Invalid cost cap');
 if(!Number.isSafeInteger(currentProjectRevision)||!Number.isSafeInteger(currentProductionRevision))return fail('Current revisions required');
 if(preview.projectId!==review.project_id||preview.productionId!==review.production_id||preview.projectRevision!==review.project_revision||preview.productionRevision!==review.production_revision||preview.maximumCostCents!==review.maximum_cost_cents)return fail('Review does not match queue preview');
 if(preview.projectRevision!==currentProjectRevision||preview.productionRevision!==currentProductionRevision)return fail('Saved production has changed');
 if(requestedMaxCents!==preview.maximumCostCents)return fail('Requested budget differs from reviewed cap');
 if(confirmed!==true)return fail('Explicit confirmation required');
 return Object.freeze({status:'planning_checks_passed_only',reviewId:review.id,maximumCostCents:requestedMaxCents,jobCreated:false,providerCalled:false,paymentAuthorized:false,generationEnabled:false,requiresSeparatePaidAuthorization:true});
}
