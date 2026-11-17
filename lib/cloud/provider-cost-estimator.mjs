import {LIMITS} from '../budget.mjs';
import {inspectTrustedProviderQuote} from './trusted-provider-quote.mjs';

/**
 * Phase 17: offline, planning-only estimate against a server-curated catalog.
 * No real providers/prices are bundled. A trusted catalog must be populated
 * from independently verified documentation; client data is never evidence.
 */
export function estimateProductionCost({kind,providerId,modelId,sceneCount,secondsPerScene,nowMs,trustedCatalog}={}){
 const blocked=(reason)=>Object.freeze({status:'blocked',reason,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
 if(!Object.hasOwn(LIMITS,kind))return blocked('Unknown production type');
 if(!Number.isSafeInteger(sceneCount)||sceneCount<1||sceneCount>500)return blocked('Invalid scene count');
 if(!Number.isSafeInteger(secondsPerScene)||secondsPerScene<1||secondsPerScene>30)return blocked('Invalid scene duration');
 if(!Number.isSafeInteger(nowMs)||nowMs<=0)return blocked('Invalid verification time');
 const entry=trustedCatalog?.[providerId]?.[modelId];
 if(!entry||entry.verified!==true)return blocked('Verified provider pricing not configured');
 if(entry.billingUnit!=='second'||!Number.isSafeInteger(entry.unitCostCents)||entry.unitCostCents<1)return blocked('Verified per-second pricing required');
 const totalSeconds=sceneCount*secondsPerScene;
 const estimatedCostCents=totalSeconds*entry.unitCostCents;
 if(!Number.isSafeInteger(estimatedCostCents))return blocked('Estimate overflow');
 const quote={providerId,modelId,estimatedCostCents,currency:entry.currency,expiresAtMs:entry.validUntilMs};
 const catalog={ [providerId]:{[modelId]:{...entry,estimatedCostCents}} };
 const result=inspectTrustedProviderQuote({providerId,modelId,quote,requestedMaxCents:LIMITS[kind],nowMs,trustedCatalog:catalog});
 return Object.freeze({...result,kind,sceneCount,totalSeconds,estimatedCostCents,maximumCostCents:LIMITS[kind],mode:'planning_only'});
}
