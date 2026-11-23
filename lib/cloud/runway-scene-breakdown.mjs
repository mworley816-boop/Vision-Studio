import {previewRunwayModelBudget} from './runway-model-budget.mjs';
/** Reference-only budget across individual scene durations and optional retries. */
export function previewRunwaySceneBreakdown({kind,modelKey,scenes,assetCents=0,audioCents=0,otherCents=0,spentCents=0,reservedCents=0}={}){
 const safe={trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false};
 const blocked=reason=>Object.freeze({status:'blocked',reason,...safe});
 if(!Array.isArray(scenes)||scenes.length<1||scenes.length>100)return blocked('Provide 1 to 100 scenes');
 const whole=n=>Number.isSafeInteger(n)&&n>=0;
 if(![assetCents,audioCents,otherCents,spentCents,reservedCents].every(whole))return blocked('Costs must be nonnegative whole cents');
 let seconds=0;
 const entries=[];
 for(let i=0;i<scenes.length;i++){
  const scene=scenes[i];
  if(!scene||typeof scene!=='object'||Array.isArray(scene)||!Number.isSafeInteger(scene.seconds)||scene.seconds<1||scene.seconds>30||!Number.isSafeInteger(scene.retries)||scene.retries<0||scene.retries>10)return blocked('Each scene needs 1–30 seconds and 0–10 retries');
  const generatedSeconds=scene.seconds*(scene.retries+1);
  seconds+=generatedSeconds;
  if(seconds>3600)return blocked('Total generated duration must not exceed 3600 seconds');
  entries.push({scene:i+1,seconds:scene.seconds,retries:scene.retries,generatedSeconds});
 }
 const video=previewRunwayModelBudget({kind,modelKey,seconds,spentCents,reservedCents});
 if(video.status!=='reference_budget_only')return blocked(video.reason||'Model reference unavailable');
 const sceneBreakdown=entries.map(e=>Object.freeze({...e,estimatedCents:e.generatedSeconds*video.centsPerSecond}));
 const extras=assetCents+audioCents+otherCents;
 const estimatedCents=video.estimatedCents+extras;
 if(!Number.isSafeInteger(estimatedCents))return blocked('Estimate exceeds safe integer range');
 return Object.freeze({status:'reference_scene_breakdown_only',kind,modelKey,scenes:Object.freeze(sceneBreakdown),totalGeneratedSeconds:seconds,videoCents:video.estimatedCents,extrasCents:extras,estimatedCents,remainingCents:video.remainingCents,withinCap:estimatedCents<=video.remainingCents,sourceUrl:video.sourceUrl,reviewedOn:video.reviewedOn,requiresFreshPricingVerification:true,...safe});
}
