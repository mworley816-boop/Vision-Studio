import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {createCloudProduction} from '../../../lib/cloud/create-production.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const blocked=(error:string,status:number)=>NextResponse.json({error,generationEnabled:false,paymentAuthorized:false,jobCreated:false},{status,headers});
/** Owner-scoped metadata creation only. Never queues, reserves or renders paid work. */
export async function POST(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return blocked('Cloud unavailable',503);
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)return blocked('Origin mismatch',403);
 if(Number(request.headers.get('content-length')||0)>4096)return blocked('Payload too large',413);
 let body:Record<string,unknown>;
 try{body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return blocked('Invalid request',400);}
 if(Object.keys(body).some(k=>!['projectId','title','kind'].includes(k)))return blocked('Unexpected production fields',400);
 if(typeof body.projectId!=='string'||typeof body.title!=='string'||typeof body.kind!=='string')return blocked('Invalid production fields',400);
 try{
  const jar=await cookies();
  const client=createServerClient(url,key,{cookies:{getAll(){return jar.getAll()},setAll(){/* Middleware manages auth refresh. */}}});
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return blocked('Authentication required',401);
  const production=await createCloudProduction(client,{projectId:body.projectId,title:body.title,kind:body.kind});
  return NextResponse.json({status:'created',production,generationEnabled:false,paymentAuthorized:false,jobCreated:false},{status:201,headers});
 }catch{return blocked('Production unavailable or creation denied',403);}
}
