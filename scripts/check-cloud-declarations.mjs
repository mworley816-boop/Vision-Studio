import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
export function inspectCloudDeclarations(implementation,declarations){
 const actual=[...implementation.matchAll(/^export\s+(?:async\s+)?(?:function|const)\s+(\w+)/gm)].map(m=>m[1]);
 const declared=[...declarations.matchAll(/^export\s+(?:declare\s+)?(?:function|const)\s+(\w+)/gm)].map(m=>m[1]);
 return {missing:actual.filter(x=>!declared.includes(x)),obsolete:declared.filter(x=>!actual.includes(x)),duplicateDeclarations:declared.filter((x,i)=>declared.indexOf(x)!==i)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const folder=resolve(root,'lib/cloud');
 const result=inspectCloudDeclarations(readFileSync(resolve(folder,'studio-cloud.mjs'),'utf8'),readFileSync(resolve(folder,'studio-cloud.d.mts'),'utf8'));
 console.log(JSON.stringify(result,null,2));
 if(Object.values(result).some(x=>x.length))process.exitCode=1;
}
