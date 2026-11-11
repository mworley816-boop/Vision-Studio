/** Read-only schema preflight. Requires explicit disposable test database opt-in. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateTestTarget} from './run-postgres-transaction-tests.mjs';
export const requiredFunctions=['approve_render_review','enqueue_approved_render','claim_approved_render','confirm_render_authorization','invalidate_render_approvals'];
export function buildPreflightSql(){
 const values=requiredFunctions.map(x=>`('${x}')`).join(',');
 return `WITH required(name) AS (VALUES ${values}) SELECT name, CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='studio_internal' AND p.proname=required.name) THEN 'present' ELSE 'missing' END FROM required ORDER BY name;`;
}
export function checkSchema({env=process.env,spawn=spawnSync}={}){
 const url=validateTestTarget(env);
 const check=spawn('psql',['--version'],{encoding:'utf8',timeout:5000});
 if(check.status!==0)throw Error('psql is required; database not contacted');
 const result=spawn('psql',['-X','-A','-t','-F','|','-v','ON_ERROR_STOP=1','-c',buildPreflightSql(),url],{encoding:'utf8',timeout:15000,env:{...process.env,PGCONNECT_TIMEOUT:'5'}});
 if(result.status!==0)throw Error('Read-only schema preflight failed; check disposable database connection');
 const rows=result.stdout.trim().split('\n').filter(Boolean).map(line=>line.split('|'));
 if(rows.length!==requiredFunctions.length||rows.some(([name,status])=>!requiredFunctions.includes(name)||status!=='present'))throw Error('Required render functions missing from disposable test database');
 return {passed:true,functions:rows.map(([name])=>name)};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(checkSchema(),null,2))}catch(error){console.error(error.message);process.exitCode=1}
}
