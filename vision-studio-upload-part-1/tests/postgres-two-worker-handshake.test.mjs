import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {twoWorkerLockSmoke} from '../scripts/check-postgres-two-worker.mjs';

const env={VISION_DISPOSABLE_DATABASE:'YES',VISION_TEST_DATABASE_URL:'postgresql://user:pass@localhost/vision_test',VISION_TEST_DATABASE_HOST:'localhost',VISION_TEST_DATABASE_NAME:'vision_test',VISION_ENABLE_TWO_WORKER_TEST:'YES'};
function child(){const p=new EventEmitter();p.stdout=new EventEmitter();p.stderr=new EventEmitter();p.kill=()=>{};return p}
test('second worker starts only after first confirms lock ownership',async()=>{
 const processes=[];
 const promise=twoWorkerLockSmoke({env,check:()=>({status:0}),spawnProcess:()=>{const p=child();processes.push(p);return p}});
 assert.equal(processes.length,1);
 processes[0].stdout.emit('data',Buffer.from('LOCK_HELD\n'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(processes.length,2);
 processes[1].stdout.emit('data',Buffer.from('f\n'));
 processes[1].emit('close',0);
 processes[0].emit('close',0);
 assert.equal((await promise).passed,true);
});
test('a competing worker that acquires lock fails the test',async()=>{
 const processes=[];
 const promise=twoWorkerLockSmoke({env,check:()=>({status:0}),spawnProcess:()=>{const p=child();processes.push(p);return p}});
 processes[0].stdout.emit('data',Buffer.from('LOCK_HELD\n'));
 await new Promise(resolve=>setImmediate(resolve));
 processes[1].stdout.emit('data',Buffer.from('t\n'));
 processes[1].emit('close',0);
 processes[0].emit('close',0);
 await assert.rejects(promise,/not blocked/);
});
