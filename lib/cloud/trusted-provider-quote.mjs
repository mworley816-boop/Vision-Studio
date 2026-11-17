import {inspectProviderQuote} from './provider-quote-check.mjs';

/**
 * Phase 16: validate quote evidence against a server-controlled provider catalog.
 * The catalog must be populated from independently verified provider documentation.
 * Caller-supplied "verified" flags never establish trust.
 * Planning only: no network calls, provider jobs, or payment authorization.
 */
export function inspectTrustedProviderQuote({providerId,modelId,quote,requestedMaxCents,nowMs, trustedCatalog}={}){
 const block=(reason)=>Object.freeze({status:'blocked',reason,providerCalled:false,jobCreated:false,paymentAuthorized:false,generationEnabled:false});
 if(!trustedCatalog||typeof trustedCatalog!=='object'||Array.isArray(trustedCatalog))return block('Trusted provider catalog is not configured');
 const entry=Object.hasOwn(trustedCatalog,providerId)?trustedCatalog[providerId]:null;
 if(!entry||typeof entry!=='object'||!Object.hasOwn(entry,modelId))return block('Provider and model not verified in trusted catalog');
 const trusted=entry[modelId];
 if(!trusted||trusted.verified!==true||typeof trusted.sourceUrl!=='string'||!/^https:\/\//.test(trusted.sourceUrl)||!Number.isSafeInteger(trusted.verifiedAtMs)||trusted.verifiedAtMs<=0)return block('Provider pricing source has not been verified');
 if(!Number.isSafeInteger(nowMs)||nowMs<trusted.verifiedAtMs)return block('Current time is invalid');
 if(!Number.isSafeInteger(trusted.validUntilMs)||nowMs>=trusted.validUntilMs)return block('Provider pricing evidence is stale');
 if(!Number.isSafeInteger(trusted.estimatedCostCents)||trusted.estimatedCostCents<1||trusted.currency!=='USD')return block('Trusted USD estimate missing');
 if(!quote||quote.providerId!==providerId||quote.modelId!==modelId||quote.estimatedCostCents!==trusted.estimatedCostCents||quote.currency!==trusted.currency||quote.expiresAtMs!==trusted.validUntilMs)return block('Quote does not match trusted provider pricing');
 return inspectProviderQuote({providerId,modelId,requestedMaxCents,generationEnabled:false,quote:{verified:true,providerId,modelId,estimatedCostCents:trusted.estimatedCostCents,currency:'USD',checkedAtMs:trusted.verifiedAtMs,currentTimeMs:nowMs,expiresAtMs:trusted.validUntilMs}});
}
