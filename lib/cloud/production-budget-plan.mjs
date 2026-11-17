import {LIMITS} from '../budget.mjs';

/** Phase 23: conservative offline planning of an entire production.
 * All line items are pre-rounded whole cents. No API, jobs, or payment.
 * Unknown costs must block, not be treated as zero.
 */
export function inspectProductionBudget({kind,videoClipCents,clipCount,retryCount,imageAssetCents,audioCents,otherCents,spentCents=0,reservedCents=0}={}){
 const blocked=(reason)=>Object.freeze({status:'blocked',reason,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
 if(!Object.hasOwn(LIMITS,kind))return blocked('Unknown production type');
 const amount=n=>Number.isSafeInteger(n)&&n>=0;
 if(!Number.isSafeInteger(clipCount)||clipCount<1||clipCount>500||!Number.isSafeInteger(retryCount)||retryCount<0||retryCount>500)return blocked('Invalid clips or retries');
 if(![videoClipCents,imageAssetCents,audioCents,otherCents,spentCents,reservedCents].every(amount))return blocked('Every production cost must be known and nonnegative');
 const videoCents=videoClipCents*(clipCount+retryCount);
 const totalCents=videoCents+imageAssetCents+audioCents+otherCents;
 const committedCents=spentCents+reservedCents;
 if(!Number.isSafeInteger(totalCents)||!Number.isSafeInteger(committedCents))return blocked('Cost overflow');
 if(committedCents+totalCents>LIMITS[kind])return blocked('Complete production estimate exceeds remaining budget');
 return Object.freeze({status:'budget_checked_only',kind,videoCents,imageAssetCents,audioCents,otherCents,estimatedCostCents:totalCents,committedCents,remainingAfterEstimateCents:LIMITS[kind]-committedCents-totalCents,maximumCostCents:LIMITS[kind],requiresSeparatePaidAuthorization:true,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
}
