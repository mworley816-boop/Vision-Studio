/** Phase 11: human approval gate for a queue proposal. This validates an approval
 * request but deliberately does not persist it or enqueue paid work. */
export function reviewQueueApproval(preview,{confirmed=false,expectedProjectRevision,expectedProductionRevision}={}){
 if(!preview||preview.status!=='awaiting_explicit_approval'||preview.requiresApproval!==true||preview.jobCreated!==false||preview.providerCalled!==false||preview.paymentAuthorized!==false)throw new Error('Verified queue preview required');
 if(!Number.isSafeInteger(preview.maximumCostCents)||preview.maximumCostCents<1||preview.maximumCostCents>2000)throw new Error('Invalid maximum cost');
 if(!Number.isSafeInteger(expectedProjectRevision)||!Number.isSafeInteger(expectedProductionRevision)||preview.projectRevision!==expectedProjectRevision||preview.productionRevision!==expectedProductionRevision)throw new Error('Queue preview changed; check again');
 if(confirmed!==true)throw new Error('Explicit human confirmation required');
 return Object.freeze({status:'approval_reviewed_not_submitted',productionId:preview.productionId,maximumCostCents:preview.maximumCostCents,jobCreated:false,providerCalled:false,paymentAuthorized:false,persisted:false});
}
