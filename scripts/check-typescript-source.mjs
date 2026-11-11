import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export function loadTypeScript() {
  try { return require('typescript'); } catch { /* dependencies not installed */ }
  // The system TypeScript CLI may be installed globally, without application dependencies.
  const candidates = [process.env.VISION_TYPESCRIPT_PATH, '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js', '/usr/local/lib/node_modules/typescript/lib/typescript.js'].filter(Boolean);
  for (const path of candidates) { try { return require(path); } catch { /* next candidate */ } }
  return null;
}
export function sourceFiles(root) {
  const found=[];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      if (entry.name==='node_modules'||entry.name==='.next') continue;
      const path=join(dir,entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(?:ts|tsx|mts|cts)$/.test(entry.name)) found.push(path);
    }
  }
  for (const dir of ['app','components','lib']) walk(join(root,dir));
  return found;
}
export function inspectTypeScriptSource(root,ts=loadTypeScript()) {
  if (!ts) return {status:'blocked',reason:'TypeScript parser unavailable; install dependencies or supply VISION_TYPESCRIPT_PATH',filesChecked:0,issues:[]};
  const issues=[];const files=sourceFiles(root);
  for (const file of files) {
    const contents=readFileSync(file,'utf8');
    const kind=file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
    const source=ts.createSourceFile(file,contents,ts.ScriptTarget.Latest,true,kind);
    for (const d of source.parseDiagnostics) {
      const loc=source.getLineAndCharacterOfPosition(d.start??0);
      issues.push({file:file.slice(root.length+1),line:loc.line+1,column:loc.character+1,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')});
    }
    // Only relative imports: package imports are checked by the full Next.js build.
    for (const stmt of source.statements) {
      const specifier=stmt.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith('.')) continue;
      const candidate=resolve(dirname(file),specifier.text);
      const targets=[candidate,candidate+'.ts',candidate+'.tsx',candidate+'.js',candidate+'.mjs',candidate+'.json',join(candidate,'index.ts'),join(candidate,'index.tsx'),join(candidate,'index.js')];
      if (!targets.some(existsSync)) issues.push({file:file.slice(root.length+1),line:source.getLineAndCharacterOfPosition(stmt.pos).line+1,code:'MISSING_RELATIVE_IMPORT',message:`Cannot resolve ${specifier.text}`});
    }
  }
  return {status:issues.length?'failed':'passed',filesChecked:files.length,issues};
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=inspectTypeScriptSource(process.cwd());console.log(JSON.stringify(result,null,2));
  if (result.status!=='passed') process.exitCode=1;
}
