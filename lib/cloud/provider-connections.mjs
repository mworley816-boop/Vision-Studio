/** Phase 25: server-only credential resolution and safe provider capability probes.
 * This module does not persist secrets, call paid endpoints, or authorize generation.
 */
const PROVIDERS=Object.freeze({
 image:Object.freeze({env:'VISION_IMAGE_API_KEY',capability:'image'}),
 video:Object.freeze({env:'VISION_VIDEO_API_KEY',capability:'video'}),
 voice:Object.freeze({env:'VISION_VOICE_API_KEY',capability:'voice'})
});
const NAME=/^[a-z][a-z0-9_-]{1,39}$/;
const KEY=/^[\x21-\x7e]{16,512}$/;
export function providerDefinitions(){return Object.entries(PROVIDERS).map(([id,p])=>({id,capability:p.capability,secretEnv:p.env}));}
export function resolveServerCredential(provider,{env,server=true}={}){
 if(server!==true)throw new Error('Provider credentials must be resolved on the server');
 if(!Object.hasOwn(PROVIDERS,provider))throw new Error('Unsupported provider');
 if(!env||typeof env!=='object')throw new Error('Server environment required');
 const key=env[PROVIDERS[provider].env];
 if(typeof key!=='string'||!KEY.test(key)||/\s/.test(key))throw new Error('Provider credential unavailable or invalid');
 return key;
}
export function validateProviderAdapter(adapter,provider){
 if(!Object.hasOwn(PROVIDERS,provider))throw new Error('Unsupported provider');
 if(!adapter||adapter.provider!==provider||adapter.capability!==PROVIDERS[provider].capability||
    adapter.supportsIdempotency!==true||typeof adapter.checkConnection!=='function'||typeof adapter.submit!=='function')
   throw new Error('Provider adapter missing required safeguards');
 return true;
}
/** Probe is read-only; adapters must implement checkConnection without generation or billing.
 * Caller supplies env from server runtime. Do not serialize or log env or thrown provider errors.
 */
export async function testProviderConnection({provider,adapter,env,timeoutMs=5000,server=true}={}){
 if(!Object.hasOwn(PROVIDERS,provider))return {provider,status:'unsupported'};
 if(server!==true)return {provider,status:'unavailable'};
 try {validateProviderAdapter(adapter,provider);}catch{return {provider,status:'adapter_unavailable'};}
 let credential;
 try {credential=resolveServerCredential(provider,{env,server});}catch{return {provider,status:'not_configured'};}
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw new Error('Invalid probe timeout');
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try {
  const result=await Promise.race([
   Promise.resolve().then(()=>adapter.checkConnection({credential,signal:controller.signal})),
   new Promise(resolve=>controller.signal.addEventListener('abort',()=>resolve({ok:false}),{once:true}))
  ]);
  return {provider,status:result?.ok===true?'connected':'unverified'};
 }catch{return {provider,status:'unverified'};}
 finally{clearTimeout(timeout);credential=undefined;}
}
/** Status contains no credential, endpoint URL, request body, or raw provider errors. */
export function connectionSummary(probes){
 if(!Array.isArray(probes))throw new Error('Invalid probe results');
 return probes.map(p=>({provider:NAME.test(p?.provider||'')?p.provider:'unknown',status:['connected','unverified','not_configured','adapter_unavailable','unsupported','unavailable'].includes(p?.status)?p.status:'unverified'}));
}
