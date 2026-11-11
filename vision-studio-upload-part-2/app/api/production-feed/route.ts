import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {loadTrustedProductionFeed} from '../../../lib/cloud/trusted-production-feed.mjs';
import {createProductionFeedStore} from '../../../lib/cloud/production-feed-store.mjs';
import {parseProductionFeedRequest,executeProductionFeedQuery} from '../../../lib/cloud/production-feed-request.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Cloud production feed is not configured'}, {status:503,headers:{'Cache-Control':'no-store'}});
 try{
  const jar=await cookies();
  const client=createServerClient(url,key,{cookies:{getAll(){return jar.getAll()},setAll(){/* Read-only endpoint; middleware must refresh auth cookies. */}}});
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return NextResponse.json({error:'Authentication required'},{status:401,headers:{'Cache-Control':'no-store'}});
  const {projectId,status,limit}=parseProductionFeedRequest(request.url);
  // The injected query executor must respect the store's validated parameter list.
  // Query through the user's authenticated JWT; never use a service-role key.
  const store=createProductionFeedStore({query:async(sql:string,values:unknown[])=>executeProductionFeedQuery(client,values,sql)});
  const feed=await loadTrustedProductionFeed({actor:{id:user.id,authenticated:true},ownerId:user.id,store,projectId,status,limit});
  return NextResponse.json(feed,{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Production feed unavailable or invalid request'},{status:400,headers:{'Cache-Control':'no-store'}})}
}
