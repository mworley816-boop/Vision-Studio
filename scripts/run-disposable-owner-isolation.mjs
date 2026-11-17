/** Execute the read-only RLS probe ONLY against an explicitly disposable test database. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateDisposableTarget} from './check-postgres-test-target.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseIsolationRows(stdout){
 const rows=stdout.split(/\r?\n/).filter(s=>/^[AB]\|/.test(s)).map(s=>s.split('|'));
 if(rows.length!==2||rows[0][0]!=='A'||rows[1][0]!=='B'||rows.some(r=>r.length!==5||r.slice(1).some(v=>v!=='t')))throw Error('Cross-owner isolation probe failed or returned incomplete results');
 return {passed:true,checks:8};
}
export function runIsolationProbe({env=process.env,spawn=spawnSync}={}){
 const url=validateDisposableTarget(env);
 const a=env.VISION_TEST_OWNER_A,b=env.VISION_TEST_OWNER_B;
 if(!uuid.test(a||'')||!uuid.test(b||'')||a.toLowerCase()===b.toLowerCase())throw Error('Two distinct valid test owner UUIDs required');
 const version=spawn('psql',['--version'],{encoding:'utf8',timeout:5000});
 if(version.status!==0)throw Error('psql is required; database not contacted');
 const script=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../supabase/phase41-disposable-cross-owner-read-probe.sql');
 const result=spawn('psql',['-X','-A','-t','-F','|','-v','ON_ERROR_STOP=1','-v',`owner_a=${a}`,'-v',`owner_b=${b}`,'-f',script,url],{encoding:'utf8',timeout:30000,env:{...env,PGCONNECT_TIMEOUT:'5'}});
 if(result.status!==0)throw Error('Disposable isolation probe failed; verify seeded owners, roles and policies');
 return parseIsolationRows(result.stdout||'');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(runIsolationProbe()))}catch(e){console.error(e.message);process.exitCode=1}
}
