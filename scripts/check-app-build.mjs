import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function inspectBuildReadiness(root) {
  const required = ['package.json','tsconfig.json','app/layout.tsx','app/page.tsx'];
  const missingFiles = required.filter(path => !existsSync(join(root,path)));
  let dependencies = [];
  if (!missingFiles.includes('package.json')) {
    try { const pkg = JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
      dependencies = Object.keys({...pkg.dependencies,...pkg.devDependencies}).filter(name => !existsSync(join(root,'node_modules',name,'package.json')));
    } catch { missingFiles.push('package.json (invalid JSON)'); }
  }
  return {ready:missingFiles.length===0 && dependencies.length===0,missingFiles,missingDependencies:dependencies};
}

export function runBuild(root, runner=spawnSync) {
  const report = inspectBuildReadiness(root);
  if (!report.ready) return {status:'blocked',...report};
  const result=runner('npm',['run','build'],{cwd:root,encoding:'utf8',timeout:180000});
  return {status:result.error?'error':result.status===0?'passed':'failed',exitCode:result.status,stdout:result.stdout??'',stderr:result.stderr??'',error:result.error?.message};
}

if (process.argv[1] && fileURLToPath(import.meta.url)===fileURLToPath(new URL(`file://${process.argv[1]}`))) {
  const root=process.cwd(); const report=process.argv.includes('--build')?runBuild(root):inspectBuildReadiness(root);
  console.log(JSON.stringify(report,null,2));
  if (report.status==='blocked'||(!('status' in report)&&!report.ready)||report.status==='failed'||report.status==='error') process.exitCode=1;
}
