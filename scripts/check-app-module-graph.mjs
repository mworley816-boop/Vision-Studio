import {readFileSync,existsSync} from 'node:fs';
import {dirname,join,resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadTypeScript,sourceFiles} from './check-typescript-source.mjs';

const extensions=['','.ts','.tsx','.mts','.cts','.mjs','.js','.json'];
export function resolveLocalImport(from,specifier){
 const base=resolve(dirname(from),specifier);
 for(const suffix of extensions){const p=base+suffix;if(existsSync(p))return p;}
 for(const suffix of extensions.slice(1)){const p=join(base,'index'+suffix);if(existsSync(p))return p;}
 return null;
}
export function inspectAppModuleGraph(root,ts=loadTypeScript()){
 if(!ts)return {status:'blocked',reason:'TypeScript compiler unavailable',filesChecked:0,issues:[]};
 const issues=[];const files=sourceFiles(root);
 for(const file of files){
  const content=readFileSync(file,'utf8');
  const sf=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const add=(node,spec)=>{
   if(!spec.startsWith('.'))return;
   const target=resolveLocalImport(file,spec);
   if(!target){const loc=sf.getLineAndCharacterOfPosition(node.getStart(sf));issues.push({file:relative(root,file),line:loc.line+1,code:'MISSING_LOCAL_MODULE',specifier:spec});}
  };
  function walk(node){
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))add(node,node.moduleSpecifier.text);
   if(ts.isCallExpression(node)&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0])&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require')))add(node,node.arguments[0].text);
   ts.forEachChild(node,walk);
  }
  walk(sf);
  for(const d of sf.parseDiagnostics){const loc=sf.getLineAndCharacterOfPosition(d.start??0);issues.push({file:relative(root,file),line:loc.line+1,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')});}

 }
 return {status:issues.length?'failed':'passed',filesChecked:files.length,issues};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectAppModuleGraph(process.cwd());console.log(JSON.stringify(result,null,2));if(result.status!=='passed')process.exitCode=1;
}
