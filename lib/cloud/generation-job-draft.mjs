import {evaluateGenerationAuthorizationReadiness} from './generation-authorization-readiness.mjs';

/** Phase 14: deterministic, non-spending job draft. Never submits or reserves work. */
export function buildGenerationJobDraft({preview,review,currentProjectRevision,currentProductionRevision,requestedMaxCents,confirmed=false,providerConfiguration}={}){
 const gate=evaluateGenerationAuthorizationReadiness({preview,review,currentProjectRevision,currentProductionRevision,requestedMaxCents,confirmed});
 const blocked=(reason)=>Object.freeze({status:'blocked',reason,jobCreated:false,providerCalled:false,paymentAuthorized:false,generationEnabled:false});
 if(gate.status!=='planning_checks_passed_only')return blocked(gate.reason);
 if(!providerConfiguration||providerConfiguration.generationEnabled!==false)return blocked('Provider configuration must explicitly disable generation');
 if(providerConfiguration.credentialsVerified!==true)return blocked('Provider credentials have not been verified');
 if(typeof providerConfiguration.providerId!=='string'||!/^[-a-z0-9_]{2,64}$/.test(providerConfiguration.providerId))return blocked('Verified provider identifier required');
 if(!Number.isSafeInteger(providerConfiguration.estimatedCostCents)||providerConfiguration.estimatedCostCents<1)return blocked('Valid cost estimate required');
 if(providerConfiguration.estimatedCostCents>requestedMaxCents)return blocked('Estimated cost exceeds approved planning cap');
 // Stable fingerprint is for draft comparison only; it is not a reservation or a uniqueness guarantee.
 const fingerprint=[preview.projectId,preview.productionId,currentProjectRevision,currentProductionRevision,requestedMaxCents,providerConfiguration.providerId].join(':');
 return Object.freeze({status:'draft_ready_only',fingerprint,productionId:preview.productionId,providerId:providerConfiguration.providerId,estimatedCostCents:providerConfiguration.estimatedCostCents,maximumCostCents:requestedMaxCents,reviewId:review.id,requiresSeparatePaidAuthorization:true,jobCreated:false,providerCalled:false,paymentAuthorized:false,generationEnabled:false});
}
