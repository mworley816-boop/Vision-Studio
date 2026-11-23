/** Reference snapshot from https://docs.dev.runwayml.com/guides/pricing/
 * Reviewed 2026-11-23. One Runway Dev credit costs USD $0.01.
 * REFERENCE ONLY: these are not independently validated at job submission.
 * Never feed these directly into an authorization or reservation path.
 */
export const RUNWAY_PRICING_SOURCE='https://docs.dev.runwayml.com/guides/pricing/';
export const RUNWAY_PRICING_REVIEWED_ON='2026-11-23';
const rates=Object.freeze({
 'gen4_turbo':5,
 'gen4.5':12,
 'wan3_480p':5,
 'wan3_720p':10,
 'wan3_1080p':20,
 'kling3.0_standard_no_audio':9,
 'kling3.0_standard_audio':13,
 'veo3.1_fast_no_audio':10,
 'veo3.1_fast_audio':15
});
export function previewRunwayOfficialReference({modelKey,seconds}={}){
 const blocked=(reason)=>Object.freeze({status:'blocked',reason,trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
 if(typeof modelKey!=='string'||!Object.hasOwn(rates,modelKey))return blocked('Unsupported model configuration');
 if(!Number.isSafeInteger(seconds)||seconds<1||seconds>3600)return blocked('Invalid duration');
 const centsPerSecond=rates[modelKey];
 return Object.freeze({status:'reference_only',modelKey,seconds,centsPerSecond,estimatedCents:seconds*centsPerSecond,sourceUrl:RUNWAY_PRICING_SOURCE,reviewedOn:RUNWAY_PRICING_REVIEWED_ON,excludesTaxesRetriesOtherAssets:true,requiresFreshPricingVerification:true,trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
}
