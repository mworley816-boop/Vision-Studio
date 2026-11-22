/** Runway Dev read-only authenticated connection probe.
 * GET /v1/organization is documented as a credit balance/usage endpoint.
 * Never sends a generation request, returns raw provider data or logs credentials.
 */
const URL='https://api.dev.runwayml.com/v1/organization';
const VERSION='2024-11-06';
/** @param {{env?: Record<string, string | undefined>, fetchImpl?: typeof fetch, timeoutMs?: number}} [options] */
export async function probeRunwayConnection({env,fetchImpl=globalThis.fetch,timeoutMs=10000}={}){
 const blocked=(status)=>Object.freeze({provider:'runway',status,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false});
 const key=env?.RUNWAYML_API_SECRET;
 if(typeof key!=='string'||key.length<16||key.length>512||/\s/.test(key))return blocked('not_configured');
 if(typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>15000)return blocked('unavailable');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetchImpl(URL,{method:'GET',headers:{Authorization:'Bearer '+key,'X-Runway-Version':VERSION,Accept:'application/json'},signal:controller.signal,redirect:'error',cache:'no-store'});
  if(response.status===400)return blocked('request_rejected');
  if(response.status===404)return blocked('endpoint_not_found');
  if(response.status===429)return blocked('rate_limited');
  if(response.status>=500)return blocked('provider_error');
  if(response.status===401||response.status===403)return blocked('authentication_rejected');
  if(!response.ok)return blocked('unverified');
  // A successful authenticated GET proves the connection, not pricing or credit sufficiency.
  return blocked('connected_read_only');
 }catch(error){return blocked(controller.signal.aborted?'timed_out':'network_unavailable');}
 finally{clearTimeout(timer);}
}
