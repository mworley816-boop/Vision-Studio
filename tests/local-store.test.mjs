import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LocalStudioStore} from '../lib/local-store.mjs';
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),'vision-store-'));try{const store=new LocalStudioStore(dir);await store.createProject({id:'p',title:'Series'});await store.createProduction({id:'e',projectId:'p',kind:'episode'});return await fn(store,dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('persists projects and jobs across instances',()=>fixture(async(s,dir)=>{await s.queueJob({id:'a',productionId:'e',estimatedCents:1000});const other=new LocalStudioStore(dir);assert.equal((await other.read()).jobs[0].status,'queued');await other.startJob('a');await other.completeJob('a',800);const p=(await s.read()).productions[0];assert.equal(p.spentCents,800);assert.equal(p.reservedCents,0);}));
test('refuses overspending without changing file',()=>fixture(async(s,dir)=>{await s.queueJob({id:'a',productionId:'e',estimatedCents:1900});const before=await readFile(s.path,'utf8');await assert.rejects(s.queueJob({id:'b',productionId:'e',estimatedCents:101}),/Hard cap/);assert.equal(await readFile(s.path,'utf8'),before);}));
test('failure releases reservation',()=>fixture(async(s)=>{await s.queueJob({id:'a',productionId:'e',estimatedCents:500});await s.stopJob('a');assert.equal((await s.read()).productions[0].reservedCents,0);}));
test('rejects excess charge and retains reservation for reconciliation',()=>fixture(async(s)=>{await s.queueJob({id:'a',productionId:'e',estimatedCents:500});await s.startJob('a');await assert.rejects(s.completeJob('a',501),/reconciliation/);assert.equal((await s.read()).productions[0].reservedCents,500);}));
test('refuses duplicate job IDs',()=>fixture(async(s)=>{await s.queueJob({id:'a',productionId:'e',estimatedCents:100});await assert.rejects(s.queueJob({id:'a',productionId:'e',estimatedCents:100}),/duplicate/);}));
test('private file mode',()=>fixture(async(s)=>{assert.equal((await stat(s.path)).mode&0o777,0o600);}));
test('lock prevents competing writers',()=>fixture(async(s)=>{let release;const blocker=new Promise(r=>release=r);let entered;const started=new Promise(r=>entered=r);const pending=s.transaction(async state=>{entered();await blocker;return state;});await started;await assert.rejects(s.queueJob({id:'a',productionId:'e',estimatedCents:1}),/busy/);release();await pending;}));
test('rejects inconsistent ledger',()=>fixture(async(s)=>{await assert.rejects(s.transaction(state=>{state.productions[0].spentCents=1;return state;}),/Ledger mismatch/);}));
