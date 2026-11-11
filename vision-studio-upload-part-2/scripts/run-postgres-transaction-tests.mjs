/** Opt-in, rollback-only SQL tests on an explicitly designated disposable Supabase database. */
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
import {validateDisposableTarget} from './check-postgres-test-target.mjs';
export function validateTestTarget(env=process.env){return validateDisposableTarget(env)}
export function runTransactionTests({env=process.env,spawn=spawnSync}={}){
 const url=validateTestTarget(env);
 const check=spawn('psql',['--version'],{encoding:'utf8',timeout:5000});
 if(check.status!==0)throw Error('psql is required; no database was contacted');
 const script=path.join(root,'supabase/phase36-transaction-tests.sql');
 const result=spawn('psql',['-X','-v','ON_ERROR_STOP=1','-f',script,url],{encoding:'utf8',timeout:60000,env:{...process.env,PGCONNECT_TIMEOUT:'5'}});
 if(result.status!==0)throw Error('PostgreSQL transaction tests failed: '+(result.stderr||'psql error').slice(0,500));
 return {passed:true,output:result.stdout};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const r=runTransactionTests();console.log(r.output)}catch(e){console.error(e.message);process.exitCode=1}
}
