import {inspectProviderCatalogEntry} from './provider-catalog-validation.mjs';
/** Validate untrusted user-entered pricing fields. Never promote evidence into a trusted catalog. */
export function previewProviderEvidence(input={},nowMs=Date.now()){
 const block=(reason)=>Object.freeze({status:'blocked',reason,requiresIndependentVerification:true,trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
 if(!input||typeof input!=='object'||Array.isArray(input))return block('Evidence must be an object');
 const fields=['providerId','modelId','sourceUrl','unitCostCents','validUntil'];
 if(fields.some(key=>typeof input[key]!=='string'))return block('All evidence fields must be strings');
 const providerId=input.providerId.trim();
 const modelId=input.modelId.trim();
 const sourceUrl=input.sourceUrl.trim();
 const rate=input.unitCostCents.trim();
 const expiry=input.validUntil.trim();
 if(!/^[1-9][0-9]{0,8}$/.test(rate))return block('Rate must be a positive whole number of USD cents per second');
 if(!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?(?:Z|[+-]\\d{2}:\\d{2})$/.test(expiry))return block('Expiration must be an ISO timestamp with an explicit timezone');
 const validUntilMs=Date.parse(expiry);
 if(!Number.isFinite(validUntilMs))return block('Invalid expiration timestamp');
 let url;
 try{url=new URL(sourceUrl);}catch{return block('Valid HTTPS source URL required');}
 const hostname=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port||hostname==='localhost'||hostname.endsWith('.localhost')||hostname.endsWith('.local')||hostname.endsWith('.internal')||hostname.endsWith('.test')||hostname.endsWith('.example')||/^(?:\\d{1,3}\\.){3}\\d{1,3}$/.test(hostname)||hostname.includes(':')||!hostname.includes('.'))return block('Public HTTPS pricing source URL required');
 // The structural validator expects a verified marker; this is an internal
 // format-check sentinel only, NOT a claim that a human verified the source.
 const entry={verified:true,sourceUrl,verifiedAtMs:nowMs,validUntilMs,currency:'USD',billingUnit:'second',unitCostCents:Number(rate),capabilities:['video']};
 const result=inspectProviderCatalogEntry({providerId,modelId,entry,nowMs});
 return {...result,status:result.status==='evidence_structurally_valid_only'?'unverified_evidence_preview':'blocked',requiresIndependentVerification:true,trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false};
}
