/** Vision Studio Phase 23: fail-closed cloud queue worker orchestration.
 * The adapter executes privileged database functions via a server-only transport.
 * It never invokes a paid provider or retries an uncertain charge.
 */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validWorker(id) { if(typeof id!=='string'||id.length<8||id.length>120) throw new Error('Invalid worker identifier'); return id; }
function validJob(id) { if(typeof id!=='string'||!uuid.test(id)) throw new Error('Invalid job identifier'); return id; }
function assertTransport(db){if(!db||typeof db.callInternal!=='function')throw new Error('Server-only internal database transport required');}
async function invoke(db,name,args){assertTransport(db);const result=await db.callInternal(name,args);if(!result||result.error)throw new Error(`Database ${name} failed: ${result?.error?.message||'empty response'}`);return result.data;}
export async function claimCloudJob(db,workerId,{leaseSeconds=120}={}){
 validWorker(workerId);if(!Number.isInteger(leaseSeconds)||leaseSeconds<30||leaseSeconds>600)throw new Error('Invalid lease');
 const jobId=await invoke(db,'claim_job',{p_worker:workerId,p_lease_seconds:leaseSeconds});
 if(jobId!==null&&jobId!==undefined)validJob(jobId);return jobId??null;
}
export async function heartbeatCloudJob(db,jobId,workerId,{leaseSeconds=120}={}){
 validJob(jobId);validWorker(workerId);if(!Number.isInteger(leaseSeconds)||leaseSeconds<30||leaseSeconds>600)throw new Error('Invalid lease');
 return (await invoke(db,'heartbeat_job',{p_job:jobId,p_worker:workerId,p_lease_seconds:leaseSeconds}))===true;
}
export async function quarantineExpiredCloudJobs(db){const n=await invoke(db,'quarantine_expired_jobs',{});if(!Number.isInteger(n)||n<0)throw new Error('Invalid quarantine count');return n;}
/** The job is CLAIMED only. Never call a paid provider here: the next phase must
 * implement provider-side idempotency, authenticated job lookup and reconciliation.
 */
export async function pollCloudQueue(db,workerId,{leaseSeconds=120,onClaim}={}){
 const jobId=await claimCloudJob(db,workerId,{leaseSeconds});
 if(!jobId)return {status:'idle',jobId:null};
 if(onClaim)await onClaim({jobId,workerId});
 return {status:'claimed_requires_provider_adapter',jobId};
}
/** Never retry uncertain provider calls; quarantine and verify external charges. */
export function recoveryDecision({status,providerRequestId}={}){
 if(status==='needs_reconciliation'||(status==='running'&&providerRequestId))return 'verify_provider_charge';
 if(status==='queued')return 'eligible_to_claim';
 return 'manual_review';
}
