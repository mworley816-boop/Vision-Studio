/** Deterministic two-session PostgreSQL advisory-lock smoke test.
 * It does not verify Vision Studio render-claim SQL; that requires dedicated fixtures.
 */
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateDisposableTarget} from './check-postgres-test-target.mjs';

export function validateTwoWorkerEnvironment(env=process.env){
 const url=validateDisposableTarget(env);
 if(env.VISION_ENABLE_TWO_WORKER_TEST!=='YES')throw Error('Explicit two-worker test opt-in required');
 return url;
}

function runPsql(sql,{url,spawnProcess,timeoutMs,env,onLine}){
 return new Promise((resolve,reject)=>{
  const child=spawnProcess('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-d',url,'-c',sql],
   {env:{...env,PGCONNECT_TIMEOUT:'5'},stdio:['ignore','pipe','pipe']});
  let output='',errors='',settled=false,lastLine='';
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value)};
  const timer=setTimeout(()=>{child.kill();finish(Error('PostgreSQL worker timed out'))},timeoutMs);
  child.stdout.on('data',data=>{
   output+=data.toString();
   const lines=output.split(/\r?\n/);
   for(const line of lines.slice(0,-1)){if(line.trim())lastLine=line.trim();onLine?.(line.trim())}
   output=lines.at(-1);
  });
  child.stderr.on('data',data=>{errors+=data.toString()});
  child.on('error',error=>finish(error));
  child.on('close',code=>{
   if(code!==0)return finish(Error('PostgreSQL worker failed: '+errors.slice(0,300)));
   if(output.trim())lastLine=output.trim();
   onLine?.(output.trim());
   finish(null,lastLine);
  });
 });
}

export async function twoWorkerLockSmoke({env=process.env,spawnProcess=spawn,check=spawnSync,timeoutMs=15000}={}){
 const url=validateTwoWorkerEnvironment(env);
 const version=check('psql',['--version'],{encoding:'utf8',timeout:5000});
 if(version.status!==0)throw Error('psql unavailable; database not contacted');
 const lockKey=90440001;
 let notifyReady;
 const ready=new Promise(resolve=>{notifyReady=resolve});
 const first=runPsql(`BEGIN; SELECT pg_advisory_xact_lock(${lockKey}); SELECT 'LOCK_HELD'; SELECT pg_sleep(3); COMMIT;`,
  {url,spawnProcess,timeoutMs,env,onLine:line=>{if(line==='LOCK_HELD')notifyReady()}});
 // Do not depend on timing guesses. The second session starts only after
 // the first connection reports it has acquired its transaction lock.
 const acquired=await Promise.race([ready,first.then(()=>{throw Error('First worker exited before reporting lock acquisition')})]);
 void acquired;
 const second=await runPsql(`SELECT pg_try_advisory_xact_lock(${lockKey});`,{url,spawnProcess,timeoutMs,env});
 await first;
 if(second!=='f')throw Error('Competing PostgreSQL session was not blocked by lock');
 return {passed:true,scope:'PostgreSQL advisory-lock smoke only; render claim/invalidation not verified'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(await twoWorkerLockSmoke())}catch(error){console.error(error.message);process.exitCode=1}
}
