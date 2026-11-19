import {inspectProviderCatalogEntry} from './provider-catalog-validation.mjs';
/** Structural preview of manually entered evidence, never trusted provider pricing. */
export function previewProviderEvidence(input={},nowMs=Date.now()){
 const providerId=String(input.providerId||'').trim();
 const modelId=String(input.modelId||'').trim();
 const sourceUrl=String(input.sourceUrl||'').trim();
 const unitCostCents=Number(input.unitCostCents);
 const validUntilMs=Date.parse(String(input.validUntil||''));
 const entry={verified:true,sourceUrl,verifiedAtMs:nowMs,validUntilMs,currency:'USD',billingUnit:'second',unitCostCents,capabilities:['video']};
 const result=inspectProviderCatalogEntry({providerId,modelId,entry,nowMs});
 return {...result,status:result.status==='evidence_structurally_valid_only'?'unverified_evidence_preview':'blocked',requiresIndependentVerification:true,trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false};
}
