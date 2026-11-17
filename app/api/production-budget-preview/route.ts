import {NextResponse} from 'next/server';
import {inspectProductionBudget} from '../../../lib/cloud/production-budget-plan.mjs';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, max-age=0'};
const blocked=(reason:string,status=400)=>NextResponse.json({status:'blocked',reason,mode:'illustrative_only',generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false},{status,headers});
/** Phase 25: untrusted manual estimates for planning only.
 * Never treat user-entered amounts as verified provider quotes or paid approval.
 */
export async function POST(request:Request){
 let input:Record<string,unknown>;
 try{
  if(Number(request.headers.get('content-length')||0)>4096)return blocked('Payload too large',413);
  input=await request.json();
  if(!input||typeof input!=='object'||Array.isArray(input))return blocked('Invalid budget input');
 }catch{return blocked('Invalid JSON');}
 const fields=['videoClipCents','clipCount','retryCount','imageAssetCents','audioCents','otherCents','spentCents','reservedCents'];
 if(fields.some(field=>!Number.isSafeInteger(input[field])||Number(input[field])<0||Number(input[field])>1000000))return blocked('All budget amounts must be nonnegative whole numbers');
 if(input.kind!=='music'&&input.kind!=='episode')return blocked('Unknown production type');
 // The endpoint is exclusively hypothetical; clients cannot assert an actual ledger.
 if(input.balanceSource!==undefined||input.verifiedBalance!==undefined||input.authorizePayment!==undefined)return blocked('Actual balance and payment authorization are not supported by this preview');
 const result=inspectProductionBudget({
  kind:input.kind,
  videoClipCents:Number(input.videoClipCents),
  clipCount:Number(input.clipCount),
  retryCount:Number(input.retryCount),
  imageAssetCents:Number(input.imageAssetCents),
  audioCents:Number(input.audioCents),
  otherCents:Number(input.otherCents),
  spentCents:Number(input.spentCents),
  reservedCents:Number(input.reservedCents)
 });
 return NextResponse.json({...result,phase:27,mode:'illustrative_only',balanceSource:'manual_hypothetical',actualAvailableBalanceVerified:false,mayAuthorizeGeneration:false,trustedProviderPricing:false},{headers});
}
