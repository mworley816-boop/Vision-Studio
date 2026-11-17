/**
 * Phase 20: validate independently researched pricing evidence before it can
 * be considered for a server-owned catalog. No bundled live provider prices.
 * This is structural validation, NOT independent source verification.
 */
const ID=/^[-a-z0-9_]{2,64}$/;
const MODEL=/^[-a-z0-9_.]{2,100}$/;
export function inspectProviderCatalogEntry({providerId,modelId,entry,nowMs}={}){
 const block=(reason)=>Object.freeze({status:'blocked',reason,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
 if(typeof providerId!=='string'||!ID.test(providerId)||typeof modelId!=='string'||!MODEL.test(modelId))return block('Invalid provider or model identifier');
 if(!entry||typeof entry!=='object'||Array.isArray(entry))return block('Provider evidence missing');
 if(entry.verified!==true)return block('Independent provider verification required');
 let url;
 try{url=new URL(entry.sourceUrl);}catch{return block('Valid official pricing source required');}
 if(url.protocol!=='https:'||!url.hostname||url.username||url.password||url.hash)return block('Secure pricing source required');
 if(!Number.isSafeInteger(nowMs)||nowMs<=0||!Number.isSafeInteger(entry.verifiedAtMs)||entry.verifiedAtMs<=0||entry.verifiedAtMs>nowMs)return block('Invalid verification timestamp');
 if(!Number.isSafeInteger(entry.validUntilMs)||entry.validUntilMs<=nowMs||entry.validUntilMs<=entry.verifiedAtMs)return block('Pricing evidence expired');
 if(entry.currency!=='USD'||entry.billingUnit!=='second'||!Number.isSafeInteger(entry.unitCostCents)||entry.unitCostCents<1)return block('Verified USD per-second rate required');
 if(!Array.isArray(entry.capabilities)||!entry.capabilities.includes('video')||entry.capabilities.some(c=>!['video','image','audio'].includes(c)))return block('Supported provider capabilities required');
 return Object.freeze({status:'evidence_structurally_valid_only',providerId,modelId,sourceUrl:url.href,validUntilMs:entry.validUntilMs,currency:'USD',billingUnit:'second',unitCostCents:entry.unitCostCents,capabilities:Object.freeze([...entry.capabilities]),requiresIndependentVerification:true,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
}
