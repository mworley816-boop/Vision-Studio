/** Validate server-supplied, independently reviewed rate evidence. Never authorizes spending. */
export function inspectRunwayRateEvidence({evidence,modelKey,seconds,nowMs}={}){
 const flags={generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false};
 const block=reason=>Object.freeze({status:'blocked',reason,...flags});
 if(!evidence||evidence.provider!=='runway'||evidence.modelKey!==modelKey||evidence.currency!=='USD'||evidence.unit!=='output_second'||evidence.sourceUrl!=='https://docs.dev.runwayml.com/guides/pricing/')return block('Matching official rate evidence required');
 if(!Number.isSafeInteger(nowMs)||!Number.isSafeInteger(evidence.verifiedAtMs)||!Number.isSafeInteger(evidence.expiresAtMs)||evidence.verifiedAtMs<=0||nowMs<evidence.verifiedAtMs||nowMs>=evidence.expiresAtMs||evidence.expiresAtMs-evidence.verifiedAtMs>86400000)return block('Fresh rate evidence required');
 if(!Number.isSafeInteger(evidence.centsPerSecond)||evidence.centsPerSecond<1||!Number.isSafeInteger(seconds)||seconds<1||seconds>3600)return block('Invalid rate or duration');
 const estimatedCents=evidence.centsPerSecond*seconds;
 if(!Number.isSafeInteger(estimatedCents))return block('Cost overflow');
 return Object.freeze({status:'rate_evidence_preview_only',modelKey,estimatedCents,currency:'USD',expiresAtMs:evidence.expiresAtMs,requiresJobQuote:true,...flags});
}
