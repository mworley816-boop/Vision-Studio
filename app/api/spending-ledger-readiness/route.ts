import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {inspectSpendingLedgerReadiness} from '../../../lib/cloud/spending-ledger-readiness.mjs';
import {productionIdIsValid,mayInspectProduction} from '../../../lib/cloud/ledger-access.mjs';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};

/** Read-only authentication and ownership preflight; never a verified ledger balance. */
export async function GET(request:Request){
 const productionId=new URL(request.url).searchParams.get('productionId');
 if(!productionIdIsValid(productionId))return NextResponse.json({error:'Invalid production identifier'},{status:400,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json(inspectSpendingLedgerReadiness(),{status:503,headers});
 try{
  const jar=await cookies();
  const client=createServerClient(url,key,{cookies:{getAll(){return jar.getAll()},setAll(){/* Read only. */}}});
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user)return NextResponse.json({error:'Authentication required'},{status:401,headers});
  const {data:production,error:productionError}=await client.from('studio_productions').select('id,owner_id').eq('id',productionId).eq('owner_id',user.id).maybeSingle();
  if(productionError||!mayInspectProduction({userId:user.id,production,requestedProductionId:productionId}))return NextResponse.json({error:'Production unavailable or access denied'},{status:404,headers});
  // Ownership alone cannot verify a spending ledger. No ledger query or writes.
  return NextResponse.json(inspectSpendingLedgerReadiness({authenticated:true,ownershipVerified:true}),{headers});
 }catch{
  return NextResponse.json({error:'Ledger readiness check unavailable'},{status:503,headers});
 }
}
