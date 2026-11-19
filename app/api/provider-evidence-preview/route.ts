import {NextResponse} from 'next/server';
import {previewProviderEvidence} from '../../../lib/cloud/provider-evidence-preview.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let input:any;
 try{const raw=await request.text();if(raw.length>4096)return NextResponse.json({error:'Input too large'},{status:413});input=JSON.parse(raw);if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid payload');}
 catch{return NextResponse.json({error:'Invalid JSON object'},{status:400});}
 const result=previewProviderEvidence(input);
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store, max-age=0'}});
}
