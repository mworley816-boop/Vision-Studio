import {previewRunwayModelBudget} from './runway-model-budget.mjs';
/** Offline multi-scene estimate. A reference-only arithmetic preview, never a paid quote. */
export function previewRunwaySceneBatch({kind,modelKey,sceneCount,secondsPerScene,retryClips=0,assetCents=0,audioCents=0,otherCents=0,spentCents=0,reservedCents=0}={}){
 const blocked=reason=>Object.freeze({status:'blocked',reason,trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
 const positive=n=>Number.isSafeInteger(n)&&n>=1;
 const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
 if(!positive(sceneCount)||sceneCount>500||!positive(secondsPerScene)||secondsPerScene>30)return blocked('Enter 1–500 scenes and 1–30 seconds per scene');
 if(![retryClips,assetCents,audioCents,otherCents,spentCents,reservedCents].every(nonnegative)||retryClips>500)return blocked('Invalid retry count or cost inputs');
 const totalClips=sceneCount+retryClips;
 const totalSeconds=totalClips*secondsPerScene;
 if(!Number.isSafeInteger(totalSeconds)||totalSeconds>3600)return blocked('Total generated duration must not exceed 3600 seconds');
 const video=previewRunwayModelBudget({kind,modelKey,seconds:totalSeconds,spentCents,reservedCents});
 if(video.status!=='reference_budget_only')return blocked(video.reason||'Model reference unavailable');
 const extras=assetCents+audioCents+otherCents;
 const totalCents=video.estimatedCents+extras;
 if(!Number.isSafeInteger(totalCents))return blocked('Estimate exceeds safe integer range');
 return Object.freeze({status:'reference_batch_only',kind,modelKey,sceneCount,secondsPerScene,retryClips,totalClips,totalSeconds,videoCents:video.estimatedCents,extrasCents:extras,estimatedCents:totalCents,remainingCents:video.remainingCents,withinCap:totalCents<=video.remainingCents,sourceUrl:video.sourceUrl,reviewedOn:video.reviewedOn,requiresFreshPricingVerification:true,actualAvailableBalanceVerified:false,trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
}
