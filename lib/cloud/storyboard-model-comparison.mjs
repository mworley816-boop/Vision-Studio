import {previewSavedStoryboardBudget} from './runway-saved-storyboard-budget.mjs';
const MODELS=Object.freeze(['gen4_turbo','gen4.5','wan3_480p','wan3_720p','wan3_1080p','kling3.0_standard_no_audio','kling3.0_standard_audio','veo3.1_fast_no_audio','veo3.1_fast_audio']);
/** Compare informational reference costs; no compatibility or live pricing guarantee. */
export function compareSavedStoryboardModels(input={}){
 const safe={trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false};
 const options=MODELS.map(modelKey=>{
  const estimate=previewSavedStoryboardBudget({...input,modelKey});
  if(estimate.status!=='saved_storyboard_reference_only')return Object.freeze({modelKey,status:'unavailable',reason:estimate.reason||'Reference estimate unavailable'});
  return Object.freeze({modelKey,status:'reference_only',estimatedCents:estimate.estimatedCents,withinCap:estimate.withinCap,remainingAfterCents:estimate.breakdown.availableAfterEstimateCents,totalGeneratedSeconds:estimate.totalGeneratedSeconds,estimatedClipCount:estimate.estimatedClipCount});
 });
 const available=options.filter(x=>x.status==='reference_only').sort((a,b)=>a.estimatedCents-b.estimatedCents||a.modelKey.localeCompare(b.modelKey));
 return Object.freeze({status:available.length?'reference_comparison_only':'blocked',options:Object.freeze(options),lowestReferenceModel:available[0]?.modelKey??null,source:'published_reference_rates_only',requiresFreshPricingVerification:true,modelCompatibilityUnverified:true,...safe});
}
