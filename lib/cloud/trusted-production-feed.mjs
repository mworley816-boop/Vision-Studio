import {monitorWorkflows,productionSummary} from '../production-monitor.mjs';

const MAX_ROWS=500;
const ID=/^[a-zA-Z0-9][a-zA-Z0-9_:-]{0,127}$/;
function identifier(value,name){if(typeof value!=='string'||!ID.test(value))throw Error(`Invalid ${name}`);return value;}
function requireOwner(actor,ownerId){
 if(!actor||typeof actor!=='object'||!actor.authenticated||typeof actor.id!=='string'||actor.id!==ownerId)throw Error('Not authorized');
}
/** Trusted server-only feed. The store MUST enforce owner authorization at the database layer. */
export async function loadTrustedProductionFeed({actor,ownerId,store,projectId,status,limit=100}){
 identifier(ownerId,'owner');requireOwner(actor,ownerId);
 if(projectId!==undefined)identifier(projectId,'project');
 if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_ROWS)throw Error('Invalid limit');
 if(!store||typeof store.listOwnerWorkflows!=='function')throw Error('Trusted store required');
 // Validate filters before calling any storage method.
 if(status!==undefined)monitorWorkflows([],{status});
 const records=await store.listOwnerWorkflows({ownerId,projectId,status,limit});
 if(!Array.isArray(records)||records.length>limit)throw Error('Invalid store response');
 const ids=new Set();
 for(const record of records){
  if(!record||typeof record!=='object')throw Error('Invalid store record');
  identifier(record.id,'workflow');identifier(record.projectId,'project');identifier(record.productionId,'production');
  if(record.ownerId!==ownerId)throw Error('Cross-owner record rejected');
  if(projectId!==undefined&&record.projectId!==projectId)throw Error('Cross-project record rejected');
  if(ids.has(record.id))throw Error('Duplicate workflow');ids.add(record.id);
 }
 const rows=monitorWorkflows(records,{projectId,status}).map(row=>({
  id:row.id,projectId:row.projectId,productionId:row.productionId,kind:row.kind,mode:row.mode,
  status:row.status,version:row.version,nextStep:row.nextStep,needsApproval:row.needsApproval,
  hasError:row.hasError,spentCents:row.spentCents,reservedCents:row.reservedCents,
  capCents:row.capCents,remainingCents:row.remainingCents,exportAssetId:row.exportAssetId
 }));
 return {source:'trusted-server',readOnly:true,rows,summary:productionSummary(rows)};
}
