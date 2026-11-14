import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {previewGenerationQueue} from '../../../lib/cloud/generation-queue-preview.mjs';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Cloud unavailable'},{status:503,headers});
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)return NextResponse.json({error:'Origin mismatch'},{status:403,headers});
 let body:Record<string,unknown>;
 try{body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return NextResponse.json({error:'Invalid request'},{status:400,headers});}
 const {projectId,productionId,projectRevision,productionRevision,requestedMaxCents}=body;
 if(typeof projectId!=='string'||typeof productionId!=='string'||!UUID.test(projectId)||!UUID.test(productionId))return NextResponse.json({error:'Invalid identifiers'},{status:400,headers});
 try{
  const jar=await cookies();
  const client=createServerClient(url,key,{cookies:{getAll(){return jar.getAll()},setAll(){/* No cookie writes */}}});
  const result=await previewGenerationQueue(client,{projectId,productionId,projectRevision,productionRevision,requestedMaxCents});
  return NextResponse.json(result,{headers});
 }catch{return NextResponse.json({error:'Queue preview unavailable. Recheck saved revisions and budget.'},{status:409,headers});}
}
