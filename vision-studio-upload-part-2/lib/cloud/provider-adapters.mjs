/** Phase 26: provider-neutral async job adapters. No real API endpoints are configured.
 * Transport is injected by the server and must implement a verified provider contract.
 * Never log raw transport errors, credentials, or generation payloads.
 */
import {authorizeProviderSubmission,submitReservedProviderJob} from './provider-reconciliation.mjs';
import {resolveServerCredential} from './provider-connections.mjs';
const CAPABILITIES=new Set(['image','video','voice']);
const ID=/^[A-Za-z0-9_.:-]{8,200}$/;
const STATUSES=new Set(['queued','running','succeeded','failed','cancelled']);
const SAFE_URL=/^https:\/\//;
const MAX_BYTES=100_000;
function validPayload(kind,p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid generation payload');
 if(typeof p.prompt!=='string'||p.prompt.trim().length<3||p.prompt.length>4000)throw Error('Invalid prompt');
 if(kind==='video'&&(!Number.isInteger(p.durationSeconds)||p.durationSeconds<1||p.durationSeconds>30))throw Error('Invalid video duration');
 if(kind==='voice'&&(!p.voiceId||!ID.test(p.voiceId)||typeof p.text!=='string'||p.text.length<1||p.text.length>5000))throw Error('Invalid voice input');
 if(kind==='image'&&(!Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<128||p.height<128||p.width>4096||p.height>4096))throw Error('Invalid image dimensions');
 const bytes=Buffer.byteLength(JSON.stringify(p));if(bytes>MAX_BYTES)throw Error('Payload too large');
 return structuredClone(p);
}
export function createGenerationAdapter({kind,transport,env,server=true}={}){
 if(server!==true)throw Error('Server-only adapter');
 if(!CAPABILITIES.has(kind))throw Error('Unsupported capability');
 if(!transport||transport.supportsIdempotency!==true||typeof transport.probe!=='function'||typeof transport.submit!=='function'||typeof transport.status!=='function')throw Error('Provider transport must support idempotent submission, probe, and status');
 const credential=resolveServerCredential(kind,{env,server});
 return Object.freeze({
  provider:kind,capability:kind,supportsIdempotency:true,
  async checkConnection({signal}={}){try{return {ok:(await transport.probe({credential,signal}))?.ok===true};}catch{return {ok:false};}},
  async submit({model,payload,idempotencyKey,maxChargeCents}){
   if(!ID.test(idempotencyKey||'')||!ID.test(model||'')||!Number.isSafeInteger(maxChargeCents)||maxChargeCents<1)throw Error('Invalid paid submission authorization');
   const safe=validPayload(kind,payload);
   try{
    const response=await transport.submit({credential,model,payload:safe,idempotencyKey,maxChargeCents});
    if(!ID.test(response?.requestId||'')||response?.idempotencyKey!==idempotencyKey)throw Error('Unverified submission');
    return {requestId:response.requestId,idempotencyKey};
   }catch{throw Error('Provider submission unverified; quarantine for reconciliation');}
  },
  async getStatus({requestId}){
   if(!ID.test(requestId||''))throw Error('Invalid request identifier');
   let result;try{result=await transport.status({credential,requestId});}catch{throw Error('Provider status unavailable');}
   if(!STATUSES.has(result?.status))throw Error('Provider status unverified');
   if(result.status==='succeeded'){
    if(typeof result.assetUrl!=='string'||!SAFE_URL.test(result.assetUrl)||result.assetUrl.length>2048)throw Error('Provider output unverified');
    return {requestId,status:result.status,assetUrl:result.assetUrl};
   }
   return {requestId,status:result.status};
  }
 });
}
/** Authorization must be obtained from a committed DB reservation before calling this. */
export async function submitApprovedGeneration({adapter,quote,reservation,approvalRequired=true,approved=false,payload,now}={}){
 const authorization=authorizeProviderSubmission({quote,reservation,approvalRequired,approved,now});
 if(adapter?.provider!==authorization.provider)throw Error('Adapter/quote provider mismatch');
 return submitReservedProviderJob(adapter,authorization,payload);
}
