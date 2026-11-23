/** Explain a reference budget overrun without implying provider execution is safe. */
export function explainStoryboardBudget(result){
 const safe={generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false};
 const blocked=reason=>Object.freeze({status:'unavailable',reason,...safe});
 if(!result||result.status!=='saved_storyboard_reference_only'||!result.breakdown||!Number.isSafeInteger(result.estimatedCents)||!Number.isSafeInteger(result.remainingCents)||!Number.isSafeInteger(result.breakdown.videoCents))return blocked('A valid saved storyboard estimate is required');
 const overByCents=Math.max(0,result.estimatedCents-result.remainingCents);
 const items=[['Video generation and retries',result.breakdown.videoCents],['Image and asset allowance',result.breakdown.assetCents],['Audio allowance',result.breakdown.audioCents],['Other costs',result.breakdown.otherCents]].sort((a,b)=>b[1]-a[1]);
 const suggestions=[];
 if(overByCents>0){
  if(result.retriesPerClip>0)suggestions.push('Compare a lower retry allowance; retries increase estimated video cost');
  suggestions.push('Review scene durations or select a lower reference-rate model; confirm actual model duration limits');
  if(result.breakdown.assetCents+result.breakdown.audioCents+result.breakdown.otherCents>0)suggestions.push('Review optional asset, audio, and other cost allowances');
 }
 return Object.freeze({status:overByCents?'over_budget':'within_reference_budget',overByCents,largestCategory:items[0][0],largestCategoryCents:items[0][1],suggestions:Object.freeze(suggestions),requiresFreshPricingVerification:true,...safe});
}
