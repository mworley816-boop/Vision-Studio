import {inspectCloudGenerationPreflight} from './generation-preflight.mjs';
/** Non-spending generation preparation. Requires the exact saved revisions seen by the owner.
 * A readiness check is not an approval to spend or a database reservation. */
export async function prepareCloudGeneration(client,{projectId,productionId,projectRevision,productionRevision,requestedMaxCents}={}){
 if(!Number.isSafeInteger(projectRevision)||projectRevision<0||!Number.isSafeInteger(productionRevision)||productionRevision<0)throw new Error('Saved revision confirmation required');
 if(!Number.isSafeInteger(requestedMaxCents)||requestedMaxCents<1)throw new Error('Positive maximum cost required');
 const result=await inspectCloudGenerationPreflight(client,{projectId,productionId});
 if(!result.ready)throw new Error('Production not ready: '+result.issues.join(' '));
 if(result.projectRevision!==projectRevision||result.productionRevision!==productionRevision)throw new Error('Saved production changed. Run readiness check again.');
 if(!Number.isSafeInteger(result.budgetCapCents)||result.budgetCapCents<1||requestedMaxCents>result.budgetCapCents)throw new Error('Requested maximum exceeds production budget');
 return Object.freeze({status:'planning_only',projectId,productionId,projectRevision,productionRevision,requestedMaxCents,budgetCapCents:result.budgetCapCents,generationEnabled:false,reservationCreated:false});
}
