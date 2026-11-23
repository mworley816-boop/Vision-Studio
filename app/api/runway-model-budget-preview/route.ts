import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {requireStudioOwner} from '../../../lib/cloud/owner-access.mjs';
import {previewRunwayModelBudget} from '../../../lib/cloud/runway-model-budget.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)return NextResponse.json({error:'Origin mismatch'},{status:403,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Cloud authentication unavailable'},{status:503,headers});
 try{
  const jar=await cookies();
  const client=createServerClient(url,key,{cookies:{getAll(){return jar.getAll()},setAll(){/* read-only */}}});
  await requireStudioOwner(client);
 }catch{return NextResponse.json({error:'Studio owner authentication required'},{status:403,headers});}
 let payload:unknown;
 try{
  const raw=await request.text();
  if(raw.length>2048)return NextResponse.json({error:'Payload too large'},{status:413,headers});
  payload=JSON.parse(raw);
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid input');
 }catch{return NextResponse.json({error:'Invalid JSON object'},{status:400,headers});}
 const input=payload as Record<string,unknown>;
 const allowed=['modelKey','kind','seconds','spentCents','reservedCents'];
 if(Object.keys(input).some(k=>!allowed.includes(k)))return NextResponse.json({error:'Unknown input field'},{status:400,headers});
 const result=previewRunwayModelBudget(input);
 return NextResponse.json(result,{headers});
}
