import {prepareCloudGeneration} from './generation-preparation.mjs';
/** Phase 10: immutable queue proposal, not a queued job or spending authorization. */
export async function previewGenerationQueue(client,request={}){
 const prepared=await prepareCloudGeneration(client,request);
 if(prepared.status!=='planning_only'||prepared.generationEnabled!==false||prepared.reservationCreated!==false)throw new Error('Unsafe preparation response');
 return Object.freeze({status:'awaiting_explicit_approval',projectId:prepared.projectId,productionId:prepared.productionId,projectRevision:prepared.projectRevision,productionRevision:prepared.productionRevision,maximumCostCents:prepared.requestedMaxCents,jobCreated:false,providerCalled:false,paymentAuthorized:false,requiresApproval:true});
}
