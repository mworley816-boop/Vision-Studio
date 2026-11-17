import {NextResponse} from 'next/server';
import {estimateProductionCost} from '../../../lib/cloud/provider-cost-estimator.mjs';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, max-age=0'};

/** Phase 18: read-only, fail-closed cost planning. No provider catalog or
 * trusted price is configured. User inputs never become pricing evidence.
 * This route cannot create jobs, contact providers, or authorize payment.
 */
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const kind=params.get('kind');
 const scenes=params.get('scenes');
 const seconds=params.get('seconds');
 const validNumber=(value:string|null)=>value!==null&&/^[1-9][0-9]{0,2}$/.test(value);
 if((kind!=='music'&&kind!=='episode')||!validNumber(scenes)||!validNumber(seconds)){
  return NextResponse.json({error:'Choose a production type and valid positive scene count/duration.',generationEnabled:false},{status:400,headers});
 }
 const result=estimateProductionCost({
  kind,sceneCount:Number(scenes),secondsPerScene:Number(seconds),
  providerId:'unconfigured',modelId:'unconfigured',nowMs:Date.now(),trustedCatalog:null
 });
 return NextResponse.json({...result,phase:18,mode:'planning_only'}, {headers});
}
