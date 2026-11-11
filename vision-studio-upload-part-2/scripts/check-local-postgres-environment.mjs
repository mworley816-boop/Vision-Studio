/** Offline preflight: never starts containers or contacts a database. */
import {spawnSync} from 'node:child_process';
import {validateDisposableTarget} from './check-postgres-test-target.mjs';
export function checkLocalPostgresEnvironment({env=process.env,spawn=spawnSync}={}){
 const checks={};
 for(const cmd of ['psql','docker']){
  try {const result=spawn(cmd,['--version'],{encoding:'utf8',timeout:5000});checks[cmd]=result.status===0}
  catch {checks[cmd]=false}
 }
 try {validateDisposableTarget(env);checks.disposableTarget=true}
 catch {checks.disposableTarget=false}
 const ready=checks.psql&&checks.disposableTarget;
 return {ready,checks,advice:ready?'Run the opt-in PostgreSQL tests only after independently verifying isolation.':'Install PostgreSQL client and configure an isolated test database; Docker is optional.'};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const result=checkLocalPostgresEnvironment();
 console.log(JSON.stringify(result,null,2));
 if(!result.ready)process.exitCode=2;
}
