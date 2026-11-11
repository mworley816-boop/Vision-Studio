import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const htmlPath=fileURLToPath(new URL('../preview/index.html',import.meta.url));
const editorPath=fileURLToPath(new URL('../preview/project-editor.mjs',import.meta.url));
const backupPath=fileURLToPath(new URL('../preview/backup.mjs',import.meta.url));
const workspacePath=fileURLToPath(new URL('../lib/workspace.mjs',import.meta.url));
const budgetPath=fileURLToPath(new URL('../lib/budget.mjs',import.meta.url));
const workspaceBackupPath=fileURLToPath(new URL('../preview/workspace-backup.mjs',import.meta.url));
const atomicPath=fileURLToPath(new URL('../preview/atomic-workspace.mjs',import.meta.url));
const bridgePath=fileURLToPath(new URL('../preview/workspace-bridge.mjs',import.meta.url));
export function createPreviewServer(){return createServer(async(req,res)=>{if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}if(req.url!=='/'&&req.url!=='/index.html'&&req.url!=='/backup.mjs'&&req.url!=='/workspace-backup.mjs'&&req.url!=='/workspace-bridge.mjs'&&req.url!=='/lib/workspace.mjs'&&req.url!=='/lib/budget.mjs'&&req.url!=='/project-editor.mjs'&&req.url!=='/atomic-workspace.mjs'){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found');return;}try{const modulePaths={'/atomic-workspace.mjs':atomicPath,'/backup.mjs':backupPath,'/workspace-backup.mjs':workspaceBackupPath,'/project-editor.mjs':editorPath,'/workspace-bridge.mjs':bridgePath,'/lib/workspace.mjs':workspacePath,'/lib/budget.mjs':budgetPath};const moduleRequest=Object.hasOwn(modulePaths,req.url);const html=await readFile(moduleRequest?modulePaths[req.url]:htmlPath);res.writeHead(200,{'Content-Type':moduleRequest?'text/javascript; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:html);}catch{res.writeHead(500).end('Preview unavailable');}});}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL(`file://${process.argv[1]}`))){const port=Number(process.env.VISION_PREVIEW_PORT||4173);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid preview port');createPreviewServer().listen(port,'127.0.0.1',()=>console.log(`Offline preview: http://127.0.0.1:${port}`));}
