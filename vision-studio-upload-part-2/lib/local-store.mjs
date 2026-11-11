/** Single-machine, single-owner durable storage. Not a cloud auth or multi-host database. */
import {mkdir,readFile,writeFile,rename,open,unlink,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {LIMITS,assertCents} from './budget.mjs';

const VALID = new Set(['queued','running','completed','failed','cancelled','needs_reconciliation']);
const MAX_BYTES=5*1024*1024;
const clone=x=>structuredClone(x);
function validate(state){
  if(!state||state.version!==1||!Array.isArray(state.projects)||!Array.isArray(state.productions)||!Array.isArray(state.jobs))throw Error('Invalid store');
  const projectIds=new Set();
  for(const p of state.projects){if(typeof p.id!=='string'||!p.id||projectIds.has(p.id))throw Error('Invalid project');projectIds.add(p.id);}
  const productionIds=new Set();
  for(const p of state.productions){
    if(typeof p.id!=='string'||!p.id||productionIds.has(p.id)||!projectIds.has(p.projectId)||!(p.kind in LIMITS))throw Error('Invalid production');
    assertCents(p.spentCents);assertCents(p.reservedCents);
    if(p.spentCents+p.reservedCents>LIMITS[p.kind])throw Error('Production cap exceeded');
    productionIds.add(p.id);
  }
  const jobIds=new Set();
  for(const j of state.jobs){
    if(typeof j.id!=='string'||!j.id||jobIds.has(j.id)||!productionIds.has(j.productionId)||!VALID.has(j.status))throw Error('Invalid job');
    assertCents(j.estimatedCents);if(j.actualCents!==undefined)assertCents(j.actualCents);
    jobIds.add(j.id);
  }
  for(const p of state.productions){
    const reserved=state.jobs.filter(j=>j.productionId===p.id&&['queued','running','needs_reconciliation'].includes(j.status)).reduce((n,j)=>n+j.estimatedCents,0);
    const spent=state.jobs.filter(j=>j.productionId===p.id&&j.status==='completed').reduce((n,j)=>n+j.actualCents,0);
    if(reserved!==p.reservedCents||spent!==p.spentCents)throw Error('Ledger mismatch');
  }
  return state;
}
export function createEmptyStore(){return {version:1,projects:[],productions:[],jobs:[]};}
export class LocalStudioStore{
  constructor(directory){if(!directory)throw Error('Directory required');this.directory=resolve(directory);this.path=join(this.directory,'studio.json');this.lockPath=join(this.directory,'.lock');}
  async init(){await mkdir(this.directory,{recursive:true,mode:0o700});try{await stat(this.path);}catch(e){if(e.code!=='ENOENT')throw e;const handle=await open(this.path,'wx',0o600).catch(e=>{if(e.code==='EEXIST')return null;throw e;});if(handle){try{await handle.writeFile(JSON.stringify(createEmptyStore()));await handle.sync();}finally{await handle.close();}}}}
  async read(){await this.init();const content=await readFile(this.path);if(content.byteLength>MAX_BYTES)throw Error('Store too large');return clone(validate(JSON.parse(content.toString('utf8'))));}
  async transaction(change){await this.init();let lock;try{lock=await open(this.lockPath,'wx',0o600);}catch(e){if(e.code==='EEXIST')throw Error('Store busy; retry later');throw e;}
    const temp=join(this.directory,`.studio-${randomUUID()}.tmp`);
    try{
      const original=await this.read();const next=await change(clone(original));validate(next);
      const serialized=JSON.stringify(next);if(Buffer.byteLength(serialized)>MAX_BYTES)throw Error('Store too large');
      const f=await open(temp,'wx',0o600);try{await f.writeFile(serialized);await f.sync();}finally{await f.close();}
      await rename(temp,this.path);
      return clone(next);
    }finally{await unlink(temp).catch(()=>{});await lock.close();await unlink(this.lockPath).catch(()=>{});}
  }
  async createProject(project){return this.transaction(s=>{if(!project?.id||!project?.title?.trim()||s.projects.some(p=>p.id===project.id))throw Error('Invalid or duplicate project');s.projects.push({id:project.id,title:project.title.trim()});return s;});}
  async createProduction(production){return this.transaction(s=>{if(!production?.id||!s.projects.some(p=>p.id===production.projectId)||!(production.kind in LIMITS)||s.productions.some(p=>p.id===production.id))throw Error('Invalid or duplicate production');s.productions.push({id:production.id,projectId:production.projectId,kind:production.kind,spentCents:0,reservedCents:0});return s;});}
  async queueJob({id,productionId,estimatedCents}){assertCents(estimatedCents);return this.transaction(s=>{const p=s.productions.find(p=>p.id===productionId);if(!p||!id||s.jobs.some(j=>j.id===id))throw Error('Invalid or duplicate job');if(p.spentCents+p.reservedCents+estimatedCents>LIMITS[p.kind])throw Error('Hard cap exceeded');p.reservedCents+=estimatedCents;s.jobs.push({id,productionId,estimatedCents,status:'queued'});return s;});}
  async startJob(id){return this.transaction(s=>{const j=s.jobs.find(j=>j.id===id&&j.status==='queued');if(!j)throw Error('Job not queued');j.status='running';return s;});}
  async completeJob(id,actualCents){assertCents(actualCents);return this.transaction(s=>{const j=s.jobs.find(j=>j.id===id&&j.status==='running');if(!j)throw Error('Job not running');if(actualCents>j.estimatedCents)throw Error('Unexpected charge requires reconciliation');const p=s.productions.find(p=>p.id===j.productionId);p.reservedCents-=j.estimatedCents;p.spentCents+=actualCents;j.status='completed';j.actualCents=actualCents;return s;});}
  /** Atomically claim one queued job. A lease is advisory: expired paid jobs require manual reconciliation. */
  async claimNextJob({workerId,now=Date.now(),leaseMs=60000}={}){
    if(typeof workerId!=='string'||!workerId.trim()||!Number.isSafeInteger(now)||!Number.isSafeInteger(leaseMs)||leaseMs<1000||leaseMs>3600000)throw Error('Invalid lease');
    let claimed=null;
    await this.transaction(s=>{
      const j=s.jobs.find(j=>j.status==='queued');
      if(j){j.status='running';j.workerId=workerId;j.leaseUntil=now+leaseMs;j.attempt=(j.attempt||0)+1;claimed=structuredClone(j);}
      return s;
    });
    return claimed;
  }
  async heartbeatJob(id,{workerId,now=Date.now(),leaseMs=60000}={}){
    if(!workerId||!Number.isSafeInteger(now)||!Number.isSafeInteger(leaseMs)||leaseMs<1000||leaseMs>3600000)throw Error('Invalid lease');
    return this.transaction(s=>{const j=s.jobs.find(j=>j.id===id&&j.status==='running'&&j.workerId===workerId);
      if(!j||j.leaseUntil<=now)throw Error('Lease expired or worker mismatch');
      j.leaseUntil=now+leaseMs;return s;});
  }
  /** Never automatically replay an expired paid request: actual provider charges may be unknown. */
  async quarantineExpiredJobs(now=Date.now()){
    if(!Number.isSafeInteger(now))throw Error('Invalid timestamp');
    let count=0;
    await this.transaction(s=>{for(const j of s.jobs){if(j.status==='running'&&Number.isSafeInteger(j.leaseUntil)&&j.leaseUntil<=now){j.status='needs_reconciliation';count++;}}return s;});
    return count;
  }
  /** Resolve an interrupted job using provider evidence, not a guess. */
  async reconcileJob(id,{actualCents,completed}={}){
    assertCents(actualCents);
    return this.transaction(s=>{const j=s.jobs.find(j=>j.id===id&&j.status==='needs_reconciliation');
      if(!j)throw Error('Job not awaiting reconciliation');
      if(actualCents>j.estimatedCents)throw Error('Charge exceeds reservation; manual ledger repair required');
      const p=s.productions.find(p=>p.id===j.productionId);
      p.reservedCents-=j.estimatedCents;p.spentCents+=actualCents;
      j.actualCents=actualCents;j.status=completed?'completed':'failed';return s;});
  }
  async stopJob(id,status='failed'){if(!['failed','cancelled'].includes(status))throw Error('Invalid stop status');return this.transaction(s=>{const j=s.jobs.find(j=>j.id===id&&['queued','running','needs_reconciliation'].includes(j.status));if(!j)throw Error('Job not active');const p=s.productions.find(p=>p.id===j.productionId);p.reservedCents-=j.estimatedCents;j.status=status;return s;});}
}
