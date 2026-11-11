/** Offline model-assisted inspection contract. No image pixels are inspected here. */
import {createVisualReview,recordVisualFinding,finalizeVisualReview} from './visual-review.mjs';
const CHECKS=new Set(['character','wardrobe','location','style','reference']);
const OUTCOMES=new Set(['match','mismatch','uncertain']);
const validId=x=>typeof x==='string'&&x.trim().length>0&&x.length<=200;
export function prepareVisualInspection({ledger,sceneId,generatedAsset,referenceAssets,requiredChecks=['character','location','style'],modelId}){
 const review=createVisualReview({ledger,sceneId,generatedAsset,referenceAssets});
 if(!validId(modelId))throw Error('Model identifier required');
 if(!Array.isArray(requiredChecks)||!requiredChecks.length||new Set(requiredChecks).size!==requiredChecks.length||requiredChecks.some(c=>!CHECKS.has(c)))throw Error('Invalid required checks');
 return {review,request:{projectId:review.projectId,productionId:review.productionId,sceneId,generatedAssetId:review.generatedAssetId,referenceAssetIds:[...review.referenceAssetIds],ledgerRevision:review.ledgerRevision,requiredChecks:[...requiredChecks],modelId},status:'prepared'};
}
/** Adapter returns structured, untrusted assessments. It must not decide render approval. */
export async function inspectVisuals(plan,{adapter,resolveVerifiedAsset,signal}={}){
 if(!plan||plan.status!=='prepared'||!plan.request||!plan.review)throw Error('Invalid inspection plan');
 if(typeof adapter?.inspect!=='function'||typeof resolveVerifiedAsset!=='function')throw Error('Trusted inspection adapter and asset resolver required');
 const req=plan.request;
 const ids=[req.generatedAssetId,...req.referenceAssetIds];
 const assets=await Promise.all(ids.map(id=>resolveVerifiedAsset({projectId:req.projectId,productionId:req.productionId,assetId:id})));
 if(assets.some((a,i)=>!a||a.verified!==true||a.assetId!==ids[i]||a.projectId!==req.projectId||a.productionId!==req.productionId))throw Error('Verified same-production assets required');
 if(signal?.aborted)throw Error('Inspection aborted');
 let raw;
 try {raw=await adapter.inspect({request:structuredClone(req),assets,signal});}
 catch {return {...plan,status:'needs_human_review',reason:'inspection_unavailable',findings:[]};}
 if(!Array.isArray(raw?.findings)||raw.findings.length>20)return {...plan,status:'needs_human_review',reason:'invalid_model_response',findings:[]};
 const seen=new Set(),findings=[];
 for(const f of raw.findings){
  if(!f||!CHECKS.has(f.kind)||!OUTCOMES.has(f.outcome)||typeof f.notes!=='string'||f.notes.length>1000||typeof f.subjectId!=='string'||f.subjectId.length>200||seen.has(`${f.kind}:${f.subjectId}`))return {...plan,status:'needs_human_review',reason:'invalid_model_response',findings:[]};
  seen.add(`${f.kind}:${f.subjectId}`);
  // Model output is advisory. No self-reported confidence or unverified URLs are trusted.
  findings.push({kind:f.kind,subjectId:f.subjectId,outcome:f.outcome,notes:f.notes,source:'model',modelId:req.modelId});
 }
 const missing=req.requiredChecks.filter(k=>!findings.some(f=>f.kind===k));
 return {...plan,status:'needs_human_review',reason:missing.length?'missing_checks':findings.some(f=>f.outcome!=='match')?'potential_mismatch':'model_matches_unconfirmed',findings};
}
/** A human explicitly records their own findings; model suggestions never count as approval. */
export function confirmInspection(inspection,{ledger,reviewerId,decisions,expectedRevision=0}){
 if(inspection?.status!=='needs_human_review'||!Array.isArray(decisions)||!decisions.length)throw Error('Human decisions required');
 if(!validId(reviewerId)||expectedRevision!==inspection.review.revision)throw Error('Reviewer or revision invalid');
 let review=inspection.review;
 for(const d of decisions){review=recordVisualFinding(review,{...d,reviewerId,source:'human'},review.revision);}
 review=finalizeVisualReview(review,{expectedRevision:review.revision,ledger,reviewerId,requiredChecks:inspection.request.requiredChecks});
 return {...inspection,status:review.decision==='approved'?'approved':'blocked',review};
}
