import {NextResponse} from 'next/server';
import {compareVideoResearch} from '../../../lib/cloud/video-provider-comparison.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const url=new URL(request.url);
 const params=url.searchParams;
 const kind=params.get('kind')??'music';
 const totalSeconds=params.has('totalSeconds')?Number(params.get('totalSeconds')):180;
 const videoSeconds=params.has('videoSeconds')?Number(params.get('videoSeconds')):0;
 const otherCostCents=params.has('otherCostCents')?Number(params.get('otherCostCents')):0;
 try{return NextResponse.json(compareVideoResearch({kind,totalSeconds,videoSeconds,otherCostCents}),{headers:{'Cache-Control':'no-store, max-age=0'}});}
 catch{return NextResponse.json({error:'Invalid planning inputs',generationEnabled:false,providerCalled:false,paymentAuthorized:false},{status:400,headers:{'Cache-Control':'no-store'}});}
}
