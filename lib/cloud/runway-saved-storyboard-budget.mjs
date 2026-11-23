import {previewRunwaySceneBreakdown} from './runway-scene-breakdown.mjs';
/** Converts an existing saved storyboard snapshot to a read-only Runway cost estimate.
 * The caller must supply an owner-verified production. No storage, network, or writes.
 * Long scenes are split into <=30s clips; no generation or approval implied.
 */
export function previewSavedStoryboardBudget({production,modelKey,assetCents=0,audioCents=0,otherCents=0,retriesPerClip=0}={}){
 const safe={trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false};
 const blocked=reason=>Object.freeze({status:'blocked',reason,...safe});
 if(!production||typeof production!=='object'||!['music','episode'].includes(production.kind)||!Array.isArray(production.scenes)||production.scenes.length<1||production.scenes.length>100)return blocked('Valid saved production with 1–100 scenes required');
 if(!Number.isSafeInteger(retriesPerClip)||retriesPerClip<0||retriesPerClip>10)return blocked('Retries per clip must be 0–10');
 const clips=[];
 for(let i=0;i<production.scenes.length;i++){
  const scene=production.scenes[i];
  if(!scene||typeof scene.description!=='string'||!scene.description.trim()||!Number.isSafeInteger(scene.duration)||scene.duration<1||scene.duration>420)return blocked('Scene '+(i+1)+' needs a description and whole-second duration between 1 and 420');
  let remaining=scene.duration;
  while(remaining>0){const seconds=Math.min(30,remaining);clips.push({seconds,retries:retriesPerClip});remaining-=seconds;}
  if(clips.length>100)return blocked('Storyboard exceeds 100 estimated clips; split into smaller productions');
 }
 const spentCents=production.spentCents??0,reservedCents=production.reservedCents??0;
 const result=previewRunwaySceneBreakdown({kind:production.kind,modelKey,scenes:clips,assetCents,audioCents,otherCents,spentCents,reservedCents});
 if(result.status!=='reference_scene_breakdown_only')return blocked(result.reason||'Storyboard estimate unavailable');
 const breakdown=Object.freeze({videoCents:result.videoCents,assetCents,audioCents,otherCents,spentCents,reservedCents,availableBeforeEstimateCents:result.remainingCents,availableAfterEstimateCents:result.remainingCents-result.estimatedCents});
 return Object.freeze({...result,breakdown,status:'saved_storyboard_reference_only',originalSceneCount:production.scenes.length,estimatedClipCount:clips.length,retriesPerClip,source:'caller_supplied_saved_storyboard',storyboardApprovalNotInferred:true,...safe});
}
