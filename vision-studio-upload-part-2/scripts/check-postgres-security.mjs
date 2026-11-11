/** Read-only privilege and signature audit for a disposable PostgreSQL database. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateTestTarget} from './run-postgres-transaction-tests.mjs';
export const signatures=[
 'studio_internal.approve_render_review(uuid,uuid,bigint,bigint)',
 'studio_internal.enqueue_approved_render(uuid,uuid,uuid,bigint,bigint)',
 'studio_internal.claim_approved_render(text,integer)',
 'studio_internal.confirm_render_authorization(uuid,text,uuid)',
 'studio_internal.invalidate_render_approvals(uuid,bigint)'
];
export function buildSecuritySql(){
 const values=signatures.map(s=>`('${s}')`).join(',');
 return `WITH required(signature) AS (VALUES ${values}), audited AS (
 SELECT signature, to_regprocedure(signature) AS oid FROM required
 ) SELECT signature,
 CASE WHEN oid IS NULL THEN 'missing'
 WHEN NOT (SELECT p.prosecdef AND COALESCE('search_path=' = ANY(p.proconfig),false) FROM pg_proc p WHERE p.oid=audited.oid) THEN 'unsafe_config'
 WHEN has_function_privilege('public',oid,'EXECUTE') OR has_function_privilege('anon',oid,'EXECUTE') OR has_function_privilege('authenticated',oid,'EXECUTE') THEN 'public_execute'
 WHEN NOT has_function_privilege('service_role',oid,'EXECUTE') THEN 'service_denied'
 ELSE 'ok' END AS status FROM audited ORDER BY signature;`;
}
export function parseSecurityRows(output){
 const rows=output.trim().split('\n').filter(Boolean).map(line=>line.split('|'));
 if(rows.length!==signatures.length || new Set(rows.map(r=>r[0])).size!==signatures.length || rows.some(([name,status])=>!signatures.includes(name)||status!=='ok')) throw Error('Render function security preflight failed: missing signature, unsafe configuration or permissions');
 return rows.map(([name])=>name);
}
export function checkSecurity({env=process.env,spawn=spawnSync}={}){
 const url=validateTestTarget(env);
 const version=spawn('psql',['--version'],{encoding:'utf8',timeout:5000});
 if(version.status!==0)throw Error('psql is required; database not contacted');
 const result=spawn('psql',['-X','-A','-t','-F','|','-v','ON_ERROR_STOP=1','-c',buildSecuritySql(),url],{encoding:'utf8',timeout:15000,env:{...process.env,PGCONNECT_TIMEOUT:'5'}});
 if(result.status!==0)throw Error('Read-only security preflight failed on disposable database');
 return {passed:true,signatures:parseSecurityRows(result.stdout)};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(checkSecurity(),null,2))}catch(e){console.error(e.message);process.exitCode=1}
}
