/** Read-only integration readiness gate. Never changes a database. */
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sql=readFileSync(path.join(root,'supabase/phase34-render-authorization.sql'),'utf8');
export function assessReadiness({sqlText=sql,psqlAvailable=false,connectionConfigured=false}={}) {
 const required=['approve_render_review','enqueue_approved_render','claim_approved_render','confirm_render_authorization','invalidate_render_approvals'];
 const missing=required.filter(name=>!new RegExp(`create\\s+or\\s+replace\\s+function\\s+studio_internal\\.${name}\\s*\\(`,'i').test(sqlText));
 return {ready:missing.length===0&&psqlAvailable&&connectionConfigured,missing,psqlAvailable,connectionConfigured,
  warnings:[...(!psqlAvailable?['PostgreSQL client (psql) unavailable']:[]),...(!connectionConfigured?['No disposable PostgreSQL connection configured']:[]),...(missing.length?[`Missing functions: ${missing.join(', ')}`]:[])]};
}
export function probePsql(){const p=spawnSync('psql',['--version'],{encoding:'utf8',timeout:5000});return p.status===0;}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const status=assessReadiness({psqlAvailable:probePsql(),connectionConfigured:Boolean(process.env.VISION_TEST_DATABASE_URL)});
 console.log(JSON.stringify(status,null,2));
 if(!status.ready)process.exitCode=2;
}
