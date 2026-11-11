import test from 'node:test';import assert from 'node:assert/strict';
import {claimCloudJob,heartbeatCloudJob,quarantineExpiredCloudJobs,pollCloudQueue,recoveryDecision} from '../lib/cloud/worker-runner.mjs';
const job='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';const worker='worker-123';
function db(data){return {callInternal:async(name,args)=>({data:typeof data==='function'?data(name,args):data})};}
test('claims one cloud job',async()=>assert.equal(await claimCloudJob(db(job),worker),job));
test('idle when no job available',async()=>assert.deepEqual(await pollCloudQueue(db(null),worker),{status:'idle',jobId:null}));
test('claimed job not dispatched to paid provider',async()=>assert.deepEqual(await pollCloudQueue(db(job),worker),{status:'claimed_requires_provider_adapter',jobId:job}));
test('heartbeat uses exact job and worker identity',async()=>assert.equal(await heartbeatCloudJob(db((name,args)=>name==='heartbeat_job'&&args.p_job===job&&args.p_worker===worker),job,worker),true));
test('quarantine count returned',async()=>assert.equal(await quarantineExpiredCloudJobs(db(2)),2));
test('fails closed on invalid lease',async()=>assert.rejects(claimCloudJob(db(job),worker,{leaseSeconds:1}),/Invalid lease/));
test('fails closed on DB error',async()=>assert.rejects(claimCloudJob({callInternal:async()=>({error:{message:'denied'}})},worker),/denied/));
test('does not retry uncertain charge',()=>assert.equal(recoveryDecision({status:'needs_reconciliation'}),'verify_provider_charge'));
