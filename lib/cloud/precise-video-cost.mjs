import {LIMITS} from '../budget.mjs';

/** Phase 22: pure, offline fixed-point pricing. Prices use micro-USD
 * (one millionth of a dollar) per second; never floating-point money.
 * Ceil each billable clip to whole cents for a conservative budget check.
 * No provider network calls, generation, or payment.
 */
export function estimatePreciseVideoCost({kind,sceneCount,secondsPerScene,microUsdPerSecond,nowMs,verifiedAtMs,validUntilMs,sourceUrl}={}){
 const blocked=(reason)=>Object.freeze({status:'blocked',reason,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
 if(!Object.hasOwn(LIMITS,kind))return blocked('Unknown production type');
 if(!Number.isSafeInteger(sceneCount)||sceneCount<1||sceneCount>500||!Number.isSafeInteger(secondsPerScene)||secondsPerScene<1||secondsPerScene>30)return blocked('Invalid scene configuration');
 if(!Number.isSafeInteger(microUsdPerSecond)||microUsdPerSecond<1||microUsdPerSecond>100000000)return blocked('Invalid fixed-point rate');
 if(!Number.isSafeInteger(nowMs)||!Number.isSafeInteger(verifiedAtMs)||!Number.isSafeInteger(validUntilMs)||verifiedAtMs<=0||verifiedAtMs>nowMs||nowMs>=validUntilMs)return blocked('Verified pricing is expired or unavailable');
 if(typeof sourceUrl!=='string'||!/^https:\/\//.test(sourceUrl))return blocked('Secure source required');
 const perSceneMicroUsd=BigInt(secondsPerScene)*BigInt(microUsdPerSecond);
 const perSceneCents=(perSceneMicroUsd+9999n)/10000n;
 const totalCents=perSceneCents*BigInt(sceneCount);
 if(totalCents>BigInt(LIMITS[kind]))return blocked('Estimated cost exceeds production budget');
 return Object.freeze({status:'estimate_checked_only',kind,sceneCount,secondsPerScene,estimatedCostCents:Number(totalCents),maximumCostCents:LIMITS[kind],sourceUrl,validUntilMs,requiresSeparatePaidAuthorization:true,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
}
