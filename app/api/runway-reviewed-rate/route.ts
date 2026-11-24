import {NextResponse} from 'next/server';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {requireStudioOwner} from '../../../lib/cloud/owner-access.mjs';
import {previewConfiguredRunwayRate} from '../../../lib/cloud/configured-runway-rate.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Origin mismatch'},{status:403,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Authentication unavailable'},{status:503,headers});
 try{const jar=await cookies();await requireStudioOwner(createServerClient(url,key,{cookies:{getAll(){return jar.getAll()},setAll(){}}}));}catch{return NextResponse.json({error:'Owner required'},{status:403,headers});}
 let body;try{body=await request.json();}catch{return NextResponse.json({error:'Invalid request'},{status:400,headers});}
 if(!body||typeof body.modelKey!=='string'||body.modelKey.length>80||!Number.isSafeInteger(body.seconds)||body.seconds<1||body.seconds>3600)return NextResponse.json({error:'Invalid model or duration'},{status:400,headers});
 let raw:unknown;try{raw=((await getCloudflareContext({async:true})).env as Record<string,unknown>).RUNWAY_REVIEWED_RATE_EVIDENCE;}catch{}
 const result=previewConfiguredRunwayRate({env:{RUNWAY_REVIEWED_RATE_EVIDENCE:typeof raw==='string'?raw:process.env.RUNWAY_REVIEWED_RATE_EVIDENCE},modelKey:body.modelKey,seconds:body.seconds,nowMs:Date.now()});
 return NextResponse.json(result,{headers});
}
