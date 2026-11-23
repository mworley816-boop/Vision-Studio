import {previewRunwayOfficialReference} from './runway-pricing-reference.mjs';
import {previewRunwayVideoBudget} from './runway-budget-preview.mjs';
/** Model-specific reference quote and cap check. Never a live quote or authorization. */
export function previewRunwayModelBudget({modelKey,kind,seconds,spentCents=0,reservedCents=0}={}){
 const reference=previewRunwayOfficialReference({modelKey,seconds});
 const safe={trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false};
 if(reference.status!=='reference_only')return Object.freeze({status:'blocked',reason:reference.reason,...safe});
 const budget=previewRunwayVideoBudget({kind,seconds,usdCentsPerSecond:reference.centsPerSecond,spentCents,reservedCents});
 if(budget.status!=='hypothetical_only')return Object.freeze({status:'blocked',reason:budget.reason,...safe});
 return Object.freeze({status:'reference_budget_only',modelKey,kind,seconds,centsPerSecond:reference.centsPerSecond,estimatedCents:budget.estimatedCents,remainingCents:budget.remainingCents,withinCap:budget.withinCap,sourceUrl:reference.sourceUrl,reviewedOn:reference.reviewedOn,excludesTaxesRetriesOtherAssets:true,requiresFreshPricingVerification:true,...safe});
}
