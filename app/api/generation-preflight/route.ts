import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {inspectCloudGenerationPreflight} from '../../../lib/cloud/generation-preflight.mjs';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Cloud unavailable'},{status:503,headers});
 const params=new URL(request.url).searchParams;
 const projectId=params.get('projectId'),productionId=params.get('productionId');
 if(!UUID.test(projectId||'')||!UUID.test(productionId||''))return NextResponse.json({error:'Invalid identifiers'},{status:400,headers});
 try{
  const jar=await cookies();
  const client=createServerClient(url,key,{cookies:{getAll(){return jar.getAll()},setAll(){/* Read-only; no cookie writes. */}}});
  const result=await inspectCloudGenerationPreflight(client,{projectId,productionId});
  return NextResponse.json(result,{headers});
 }catch{return NextResponse.json({error:'Preflight unavailable or access denied'},{status:403,headers});}
}
