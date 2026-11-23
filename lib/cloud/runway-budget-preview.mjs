import {LIMITS} from '../budget.mjs';
/** Offline, non-authorizing affordability analysis for a quoted Runway rate.
 * Inputs are hypothetical until separately verified against official provider pricing.
 * No API calls, reservation, job creation or payment.
 */
export function previewRunwayVideoBudget({kind,seconds,usdCentsPerSecond,spentCents=0,reservedCents=0}={}){
 const blocked=(reason)=>Object.freeze({status:'blocked',reason,trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
 if(!Object.hasOwn(LIMITS,kind))return blocked('Unknown production kind');
 if(!Number.isSafeInteger(seconds)||seconds<=0||seconds>3600)return blocked('Duration must be a positive whole number of seconds up to 3600');
 if(!Number.isSafeInteger(usdCentsPerSecond)||usdCentsPerSecond<=0||usdCentsPerSecond>1000000)return blocked('Quote must be a positive whole number of USD cents per second');
 if(!Number.isSafeInteger(spentCents)||spentCents<0||!Number.isSafeInteger(reservedCents)||reservedCents<0)return blocked('Spent and reserved amounts must be nonnegative whole cents');
 const estimatedCents=seconds*usdCentsPerSecond;
 if(!Number.isSafeInteger(estimatedCents))return blocked('Estimate exceeds safe integer range');
 const remainingCents=Math.max(0,LIMITS[kind]-spentCents-reservedCents);
 return Object.freeze({status:'hypothetical_only',kind,seconds,usdCentsPerSecond,estimatedCents,remainingCents,withinCap:estimatedCents<=remainingCents,requiresIndependentPricingVerification:true,trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
}
