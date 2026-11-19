import {productionBlockerSummary} from './production-blocker-summary.mjs';
export function productionBlockerChecklist(document,bible={},assets=[]){
 const report=productionBlockerSummary(document,bible,assets);
 const lines=['VISION STUDIO · PRODUCTION PREPARATION CHECKLIST','Scenes passing metadata checks: '+report.readyCount+' / '+report.total,''];
 if(!report.blockers.length)lines.push('No metadata blockers found. This is not provider or generation readiness.');
 for(const blocker of report.blockers){
  lines.push('[ ] '+blocker.issue);
  lines.push('    Affected scenes: '+blocker.scenes.join(', '));
 }
 lines.push('','Review and save corrections in Vision Studio. Scene approvals remain manual.','Provider credentials, verified pricing, image rights, and actual generation readiness have not been confirmed.','No generation or spending authorized.');
 return lines.join('\n');
}
