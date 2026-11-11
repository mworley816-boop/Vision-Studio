/** Offline visual-review evidence workflow. Does NOT analyze pixels or call a vision model. */
import {buildContinuityBrief} from './continuity-engine.mjs';
const id=(x,label)=>{if(typeof x!=='string'||!x.trim())throw Error(`${label} required`);return x.trim()};
const kinds=new Set(['character','wardrobe','location','style','reference']);
const outcomes=new Set(['match','mismatch','uncertain']);
export function createVisualReview({ledger,sceneId,generatedAsset,referenceAssets=[]}){
 const brief=buildContinuityBrief(ledger,sceneId);
 if(!ledger.scenes.find(s=>s.sceneId===sceneId)?.approved)throw Error('Scene continuity approval required');
 if(!generatedAsset||generatedAsset.verified!==true||generatedAsset.projectId!==ledger.projectId||generatedAsset.productionId!==ledger.productionId)throw Error('Verified same-production generated asset required');
 if(!referenceAssets.length||referenceAssets.some(a=>!a||a.verified!==true||a.projectId!==ledger.projectId||a.productionId!==ledger.productionId||!brief.referenceAssetIds.includes(a.assetId)))throw Error('Verified same-production approved references required');
 const unique=new Set(referenceAssets.map(a=>a.assetId));if(unique.size!==referenceAssets.length)throw Error('Duplicate reference asset');
 return {projectId:ledger.projectId,productionId:ledger.productionId,sceneId,ledgerRevision:ledger.revision,generatedAssetId:id(generatedAsset.assetId,'Generated asset ID'),referenceAssetIds:[...unique],findings:[],decision:'pending',revision:0};
}
export function recordVisualFinding(review,{kind,subjectId='',outcome,notes='',reviewerId,source='human'},expectedRevision){
 if(expectedRevision!==review.revision)throw Error('Stale review revision');
 if(review.decision!=='pending')throw Error('Review is finalized');
 if(!kinds.has(kind)||!outcomes.has(outcome))throw Error('Invalid finding');
 if(source!=='human')throw Error('Automated visual evidence is not configured');
 reviewerId=id(reviewerId,'Reviewer ID');
 if(typeof notes!=='string'||notes.length>2000)throw Error('Invalid notes');
 if(outcome!=='match'&&!notes.trim())throw Error('Mismatch or uncertainty requires notes');
 const key=`${kind}:${subjectId}`;
 const finding={kind,subjectId, outcome,notes:notes.trim(),reviewerId,source};
 return {...review,findings:[...review.findings.filter(f=>`${f.kind}:${f.subjectId}`!==key),finding],revision:review.revision+1};
}
export function finalizeVisualReview(review,{expectedRevision,ledger,reviewerId,requiredChecks=[]}){
 if(expectedRevision!==review.revision)throw Error('Stale review revision');
 if(review.decision!=='pending')throw Error('Already finalized');
 id(reviewerId,'Reviewer ID');
 if(!ledger||ledger.projectId!==review.projectId||ledger.productionId!==review.productionId||ledger.revision!==review.ledgerRevision)throw Error('Continuity changed; review again');
 if(!Array.isArray(requiredChecks)||!requiredChecks.length||requiredChecks.some(k=>!kinds.has(k)))throw Error('Required checks missing');
 const missing=requiredChecks.filter(k=>!review.findings.some(f=>f.kind===k));
 if(missing.length)throw Error('Incomplete visual review');
 const issues=review.findings.filter(f=>f.outcome!=='match');
 const decision=issues.length?'blocked':'approved';
 return {...review,decision,finalizedBy:reviewerId,revision:review.revision+1,issues:issues.map(f=>({kind:f.kind,subjectId:f.subjectId,outcome:f.outcome,notes:f.notes}))};
}
export function canRenderReviewedScene({review,ledger,assetId}){
 return !!(review&&ledger&&review.decision==='approved'&&review.projectId===ledger.projectId&&review.productionId===ledger.productionId&&review.ledgerRevision===ledger.revision&&review.generatedAssetId===assetId);
}
