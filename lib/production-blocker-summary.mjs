import {productionReadinessReport} from './production-readiness-report.mjs';
export function productionBlockerSummary(document,bible={},assets=[]){
 const report=productionReadinessReport(document,bible,assets);
 const groups=new Map();
 for(const row of report.rows)for(const issue of row.issues){
  const key=issue.replace(/^.*?: (appearance missing|wardrobe missing|reference image missing|reference image unavailable)$/,'Character: $1');
  if(!groups.has(key))groups.set(key,{issue:key,scenes:[]});
  groups.get(key).scenes.push(row.number);
 }
 const blockers=[...groups.values()].map(group=>({...group,scenes:[...new Set(group.scenes)].sort((a,b)=>a-b)})).sort((a,b)=>b.scenes.length-a.scenes.length||a.issue.localeCompare(b.issue));
 return {total:report.total,readyCount:report.readyCount,needsAttention:report.needsAttention,blockers,providerPricingVerified:false,generationAuthorized:false};
}
