/** Trusted local render executor. Production deployments need a DB-atomic claim and recheck. */
import {executeFinalAssembly,prepareFinalAssembly} from './final-assembly.mjs';
import {canRenderReviewedScene} from './visual-review.mjs';

const validId=(s)=>typeof s==='string'&&s.length>0&&s.length<=200&&s.trim()===s;
/**
 * A server worker must load trusted state immediately before local rendering.
 * The store is injected so tests cannot accidentally invoke paid providers.
 */
export async function executeApprovedRender({jobId,workerId,projectId,productionId,sceneId,assetId,reviewId,assemblyPlan},store,options={}){
 for(const id of [jobId,workerId,projectId,productionId,sceneId,assetId,reviewId])if(!validId(id))throw Error('Invalid render identity');
 if(!store||['claimApprovedRender','loadReview','loadLedger','verifyAsset','completeRender','failRender'].some(k=>typeof store[k]!=='function'))throw Error('Trusted render store required');
 // Validate plans before claiming work; no side effects for invalid input.
 const prepared=prepareFinalAssembly(assemblyPlan);
 const claim=await store.claimApprovedRender({jobId,workerId,projectId,productionId,sceneId,assetId,reviewId});
 if(!claim||claim.claimed!==true||!validId(claim.leaseToken))throw Error('Render claim rejected');
 const identity={jobId,workerId,leaseToken:claim.leaseToken,projectId,productionId,sceneId,assetId,reviewId};
 try {
  const [review,ledger,asset]=await Promise.all([
   store.loadReview({projectId,productionId,reviewId}),
   store.loadLedger({projectId,productionId}),
   store.verifyAsset({projectId,productionId,assetId})
  ]);
  if(!review||!ledger||!asset||review.projectId!==projectId||review.productionId!==productionId||review.sceneId!==sceneId||review.reviewId!==reviewId||ledger.projectId!==projectId||ledger.productionId!==productionId||asset.projectId!==projectId||asset.productionId!==productionId||asset.assetId!==assetId||asset.verified!==true||!canRenderReviewedScene({review,ledger,assetId}))throw Error('Approved scene, current ledger and verified asset required');
  // DB implementation MUST atomically confirm the lease and review revision at the render boundary.
  if(typeof store.confirmRenderAuthorization!=='function')throw Error('Atomic render authorization required');
  const permitted=await store.confirmRenderAuthorization({...identity,expectedReviewRevision:review.revision,expectedLedgerRevision:ledger.revision});
  if(permitted!==true)throw Error('Render authorization changed');
  const result=await executeFinalAssembly(prepared,options);
  const saved=await store.completeRender({...identity,outputPath:result.outputPath});
  if(saved!==true)throw Error('Could not commit render completion');
  return {jobId,status:'completed',outputPath:result.outputPath};
 }catch(err){
  await store.failRender({...identity,errorCode:'RENDER_FAILED'}).catch(()=>{});
  throw err;
 }
}
