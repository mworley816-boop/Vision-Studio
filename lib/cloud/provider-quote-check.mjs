/** Phase 15 provider-neutral quote verification. No network requests, secrets, or spending.
 * A quote is an estimate, not a guarantee or authorization to purchase.
 */
export function inspectProviderQuote({providerId,modelId,quote,requestedMaxCents,generationEnabled=false}={}){
 const block=(reason)=>Object.freeze({status:'blocked',reason,providerCalled:false,jobCreated:false,paymentAuthorized:false,generationEnabled:false});
 if(generationEnabled!==false)return block('Generation must remain disabled');
 if(typeof providerId!=='string'||!/^[-a-z0-9_]{2,64}$/.test(providerId))return block('Provider must be selected and verified');
 if(typeof modelId!=='string'||!/^[-a-z0-9_.]{2,100}$/.test(modelId))return block('Provider model must be identified');
 if(!Number.isSafeInteger(requestedMaxCents)||requestedMaxCents<1||requestedMaxCents>2000)return block('Valid budget required');
 if(!quote||quote.verified!==true||quote.providerId!==providerId||quote.modelId!==modelId)return block('Verified provider quote required');
 if(!Number.isSafeInteger(quote.estimatedCostCents)||quote.estimatedCostCents<1)return block('Valid quote amount required');
 if(quote.currency!=='USD')return block('USD quote required');
 if(!Number.isSafeInteger(quote.expiresAtMs)||quote.expiresAtMs<=0)return block('Quote expiry required');
 if(!Number.isSafeInteger(quote.checkedAtMs)||quote.checkedAtMs<=0||quote.checkedAtMs>quote.expiresAtMs)return block('Valid quote verification time required');
 if(!Number.isSafeInteger(quote.currentTimeMs)||quote.currentTimeMs<quote.checkedAtMs||quote.currentTimeMs>=quote.expiresAtMs)return block('Quote expired or time unverified');
 if(quote.estimatedCostCents>requestedMaxCents)return block('Quote exceeds production budget');
 return Object.freeze({status:'quote_checked_only',providerId,modelId,estimatedCostCents:quote.estimatedCostCents,maximumCostCents:requestedMaxCents,expiresAtMs:quote.expiresAtMs,providerCalled:false,jobCreated:false,paymentAuthorized:false,generationEnabled:false,requiresSeparatePaidAuthorization:true});
}
