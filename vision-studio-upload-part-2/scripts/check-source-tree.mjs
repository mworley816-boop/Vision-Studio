import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

export function inspectSourceTree(root){
 const issues=[];
 const expected=['app/page.tsx','app/layout.tsx','components','lib','preview','tests','package.json','tsconfig.json'];
 for(const p of expected)if(!existsSync(join(root,p)))issues.push(`Missing: ${p}`);
 const nested=readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^vision-studio-phase\d+-src$/.test(e.name)).map(e=>e.name);
 for(const name of nested)issues.push(`Nested legacy source tree: ${name} (may be compiled twice)`);
 if(existsSync(join(root,'tsconfig.json'))){try{const config=JSON.parse(readFileSync(join(root,'tsconfig.json'),'utf8'));if(!Array.isArray(config.exclude)||!config.exclude.includes('node_modules'))issues.push('tsconfig must exclude node_modules');}catch{issues.push('Invalid tsconfig.json')}}
 return {ok:issues.length===0,issues};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL(`file://${process.argv[1]}`))){const report=inspectSourceTree(process.cwd());console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;}
