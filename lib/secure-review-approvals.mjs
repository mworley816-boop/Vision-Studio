/** Server-side approval orchestration contract. Caller MUST authenticate actor and load trusted records. */
import {canRenderReviewedScene} from './visual-review.mjs';
const nonempty=(x,label)=>{if(typeof x!=='string'||!x.trim()||x.length>200)throw Error(`${label} invalid`);return x.trim()};
const same=(a,b)=>a.projectId===b.projectId&&a.productionId===b.productionId;
/** Persist only using compare-and-swap on review revision; never trust browser review objects. */
export async function approveVisualReview({actor,projectId,productionId,sceneId,reviewId,expectedRevision,decisions,requiredChecks},store){
 nonempty(actor?.id,'Actor');for(const [v,k] of [[projectId,'Project'],[productionId,'Production'],[sceneId,'Scene'],[reviewId,'Review']])nonempty(v,k);
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('Revision invalid');
 if(!Array.isArray(decisions)||!decisions.length||decisions.length>20)throw Error('Human decisions required');
 if(!store||['authorize','loadReview','loadLedger','compareAndSwapReview'].some(k=>typeof store[k]!=='function'))throw Error('Trusted store required');
 if(await store.authorize({actorId:actor.id,projectId,productionId,permission:'approve_visual_review'})!==true)throw Error('Forbidden');
 const [record,ledger]=await Promise.all([store.loadReview({projectId,productionId,reviewId}),store.loadLedger({projectId,productionId})]);
 if(!record||!ledger||!same(record,ledger)||record.projectId!==projectId||record.productionId!==productionId||record.sceneId!==sceneId||record.reviewId!==reviewId)throw Error('Trusted review or ledger mismatch');
 if(record.revision!==expectedRevision||record.decision!=='pending')throw Error('Stale or finalized review');
 if(record.ledgerRevision!==ledger.revision)throw Error('Continuity changed; review again');
 const {recordVisualFinding,finalizeVisualReview}=await import('./visual-review.mjs');
 let updated=record;
 for(const decision of decisions){updated=recordVisualFinding(updated,{...decision,reviewerId:actor.id,source:'human'},updated.revision);}
 updated=finalizeVisualReview(updated,{expectedRevision:updated.revision,ledger,reviewerId:actor.id,requiredChecks});
 const persisted=await store.compareAndSwapReview({projectId,productionId,reviewId,expectedRevision,expectedLedgerRevision:ledger.revision,record:updated});
 if(persisted!==true)throw Error('Concurrent update; review again');
 return {reviewId,decision:updated.decision,revision:updated.revision};
}
/** Must be invoked at the server render submission boundary, using trusted persisted records. */
export async function authorizeReviewedRender({actor,projectId,productionId,sceneId,assetId,reviewId},store){
 nonempty(actor?.id,'Actor');for(const [v,k] of [[projectId,'Project'],[productionId,'Production'],[sceneId,'Scene'],[assetId,'Asset'],[reviewId,'Review']])nonempty(v,k);
 if(!store||['authorize','loadReview','loadLedger','verifyAsset','enqueueRenderIfCurrent'].some(k=>typeof store[k]!=='function'))throw Error('Trusted store required');
 if(await store.authorize({actorId:actor.id,projectId,productionId,permission:'render'})!==true)throw Error('Forbidden');
 const [review,ledger,asset]=await Promise.all([store.loadReview({projectId,productionId,reviewId}),store.loadLedger({projectId,productionId}),store.verifyAsset({projectId,productionId,assetId})]);
 if(!review||!ledger||!asset||asset.verified!==true||asset.assetId!==assetId||!same(asset,ledger)||review.sceneId!==sceneId||review.reviewId!==reviewId||!canRenderReviewedScene({review,ledger,assetId}))throw Error('Current approved visual review and verified asset required');
 // Atomic enqueue must recheck approval, ledger revision, asset verification and permissions in the database transaction.
 const result=await store.enqueueRenderIfCurrent({actorId:actor.id,projectId,productionId,sceneId,assetId,reviewId,expectedReviewRevision:review.revision,expectedLedgerRevision:ledger.revision});
 if(!result||result.accepted!==true||typeof result.jobId!=='string'||!result.jobId.trim())throw Error('Render enqueue rejected or stale');
 return {jobId:result.jobId,accepted:true};
}
