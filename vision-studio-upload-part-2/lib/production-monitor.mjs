import {workflowNextStep} from './workflow-automation.mjs';
import {LIMITS} from './budget.mjs';

const statuses = new Set(['draft','awaiting_storyboard_approval','preparing','awaiting_asset_approval','ready_to_render','rendering','awaiting_export_approval','complete','failed','cancelled']);
export function monitorWorkflows(workflows, {projectId, status}={}) {
 if (!Array.isArray(workflows)) throw Error('Workflows must be an array');
 if (status && !statuses.has(status)) throw Error('Unknown status filter');
 const filtered = workflows.filter(w=> (!projectId || w.projectId===projectId) && (!status || w.status===status));
 return filtered.map(w=>{
  if (!statuses.has(w.status) || !(w.kind in LIMITS)) throw Error('Invalid workflow');
  const spent = w.spentCents ?? 0, reserved=w.reservedCents ?? 0;
  if (![spent,reserved].every(x=>Number.isSafeInteger(x)&&x>=0) || spent+reserved>LIMITS[w.kind]) throw Error('Invalid budget amounts');
  return {id:w.id,projectId:w.projectId,productionId:w.productionId,kind:w.kind,mode:w.mode,status:w.status,version:w.version,
   nextStep:workflowNextStep(w),needsApproval:w.status.startsWith('awaiting_'),hasError:w.status==='failed',
   spentCents:spent,reservedCents:reserved,capCents:LIMITS[w.kind],remainingCents:LIMITS[w.kind]-spent-reserved,
   exportAssetId:w.status==='complete'?w.exportAssetId:null};
 });
}
export function productionSummary(rows){
 return {total:rows.length,active:rows.filter(r=>['preparing','ready_to_render','rendering'].includes(r.status)).length,
  awaitingApproval:rows.filter(r=>r.needsApproval).length,failed:rows.filter(r=>r.hasError).length,
  completed:rows.filter(r=>r.status==='complete').length};
}
