import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {saveGenerationApprovalReview,listGenerationApprovalReviews} from '../../../lib/cloud/generation-approval-storage.mjs';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={'Cache-Control':'private, no-store'};
async function client(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error('Cloud unavailable');const jar=await cookies();return createServerClient(url,key,{cookies:{getAll(){return jar.getAll()},setAll(){/* No cookie writes */}}});}
export async function GET(request:Request){
 const params=new URL(request.url).searchParams,projectId=params.get('projectId'),productionId=params.get('productionId');
 if(!UUID.test(projectId||'')||!UUID.test(productionId||''))return NextResponse.json({error:'Invalid identifiers'},{status:400,headers});
 try{return NextResponse.json(await listGenerationApprovalReviews(await client(),{projectId,productionId}),{headers});}
 catch{return NextResponse.json({error:'Approval history unavailable or not configured'},{status:503,headers});}
}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return NextResponse.json({error:'Origin mismatch'},{status:403,headers});
 let body:Record<string,unknown>;try{body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return NextResponse.json({error:'Invalid request'},{status:400,headers});}
 const {projectId,productionId,projectRevision,productionRevision,requestedMaxCents,confirmed}=body;
 if(typeof projectId!=='string'||typeof productionId!=='string'||!UUID.test(projectId)||!UUID.test(productionId)||confirmed!==true)return NextResponse.json({error:'Valid identifiers and explicit confirmation required'},{status:400,headers});
 try{return NextResponse.json(await saveGenerationApprovalReview(await client(),{projectId,productionId,projectRevision,productionRevision,requestedMaxCents,confirmed}),{headers});}
 catch{return NextResponse.json({error:'Approval not saved. Storage may not be configured or saved revisions changed.'},{status:409,headers});}
}
