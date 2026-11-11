import {LIMITS, assertCents} from './budget.mjs';

// Pure state transitions. A real worker must persist transitions atomically and
// perform external side effects through an idempotent outbox.
const STATES = ['draft','awaiting_storyboard_approval','preparing','awaiting_asset_approval','ready_to_render','rendering','awaiting_export_approval','complete','failed','cancelled'];
const ACTIONS = {
 submit: {draft: 'preparing'},
 approve_storyboard: {awaiting_storyboard_approval: 'preparing'},
 assets_ready: {preparing: 'ready_to_render'},
 approve_assets: {awaiting_asset_approval: 'ready_to_render'},
 start_render: {ready_to_render: 'rendering'},
 render_succeeded: {rendering: 'complete'},
 approve_export: {awaiting_export_approval: 'complete'},
 retry: {failed: 'preparing'}
};
const CHECKPOINTS = ['storyboard','assets','export'];
const now = () => new Date().toISOString();
export function createWorkflow({id,projectId,productionId,kind,mode='approval',checkpoints=CHECKPOINTS}={}) {
 if(!id||!projectId||!productionId||!(kind in LIMITS)||!['automatic','approval'].includes(mode)) throw Error('Invalid workflow');
 if(!Array.isArray(checkpoints)||checkpoints.some(x=>!CHECKPOINTS.includes(x))) throw Error('Invalid checkpoint');
 return {id,projectId,productionId,kind,mode,checkpoints:[...new Set(checkpoints)],status:'draft',version:0,spentCents:0,reservedCents:0,events:[],jobIds:[],exportAssetId:null};
}
function update(w,status,type,details={}) {
 return {...w,status,version:w.version+1,events:[...w.events,{sequence:w.version+1,type,status,at:now(),...details}]};
}
function verify(w,expectedVersion) {
 if(!w||!STATES.includes(w.status)) throw Error('Invalid workflow state');
 if(expectedVersion!==undefined&&w.version!==expectedVersion) throw Error('Stale workflow version');
}
export function advanceWorkflow(w,action,{expectedVersion,assetId,verifiedExport=false,allScenesApproved=false,assetsVerified=false}={}) {
 verify(w,expectedVersion);
 if(action==='cancel') {
  if(['complete','cancelled'].includes(w.status)||w.reservedCents>0) throw Error('Cannot cancel with outstanding reservations or after completion');
  return update(w,'cancelled',action);
 }
 if(action==='fail') {
  if(['complete','cancelled','failed'].includes(w.status)) throw Error('Cannot fail workflow');
  return update(w,'failed',action);
 }
 if(action==='submit') {
  if(w.status!=='draft') throw Error('Workflow already submitted');
  return update(w,w.mode==='approval'&&w.checkpoints.includes('storyboard')?'awaiting_storyboard_approval':'preparing',action);
 }
 if(action==='approve_storyboard'&&!allScenesApproved) throw Error('All storyboard scenes require approval');
 if(action==='assets_ready') {
  if(!assetsVerified) throw Error('Verified assets required');
  if(w.reservedCents!==0) throw Error('Outstanding reservations');
  if(w.status!=='preparing') throw Error('Not preparing');
  return update(w,w.mode==='approval'&&w.checkpoints.includes('assets')?'awaiting_asset_approval':'ready_to_render',action);
 }
 if(action==='approve_assets'&&!assetsVerified) throw Error('Verified assets required');
 if(action==='start_render'&&w.reservedCents!==0) throw Error('Outstanding reservations');
 if(action==='render_succeeded') {
  if(!verifiedExport||!assetId?.trim()) throw Error('Verified export required');
  if(w.status!=='rendering') throw Error('Not rendering');
  const status=w.mode==='approval'&&w.checkpoints.includes('export')?'awaiting_export_approval':'complete';
  return {...update(w,status,action,{assetId}),exportAssetId:assetId};
 }
 if(action==='approve_export'&&!w.exportAssetId) throw Error('Missing export');
 const status=ACTIONS[action]?.[w.status];
 if(!status) throw Error(`Invalid transition: ${w.status} -> ${action}`);
 return update(w,status,action);
}
export function reserveWorkflowJob(w,{jobId,maxCents,expectedVersion}={}) {
 verify(w,expectedVersion);assertCents(maxCents);
 if(!jobId||maxCents===0||w.jobIds.includes(jobId)) throw Error('Invalid or duplicate job');
 if(w.status!=='preparing') throw Error('Workflow is not preparing');
 if(w.spentCents+w.reservedCents+maxCents>LIMITS[w.kind]) throw Error('Production hard cap exceeded');
 const next=update(w,w.status,'reserve',{jobId,maxCents});
 return {...next,reservedCents:w.reservedCents+maxCents,jobIds:[...w.jobIds,jobId]};
}
export function reconcileWorkflowJob(w,{jobId,maxCents,actualCents,expectedVersion}={}) {
 verify(w,expectedVersion);assertCents(maxCents);assertCents(actualCents);
 const reservation=w.events.find(e=>e.type==='reserve'&&e.jobId===jobId);
 if(!reservation||reservation.maxCents!==maxCents||w.events.some(e=>e.type==='settle'&&e.jobId===jobId)) throw Error('Unknown or settled reservation');
 if(actualCents>maxCents||w.reservedCents<maxCents) throw Error('Charge exceeds reservation');
 const next=update(w,w.status,'settle',{jobId,actualCents});
 return {...next,reservedCents:w.reservedCents-maxCents,spentCents:w.spentCents+actualCents};
}
export function workflowNextStep(w) {
 const steps={draft:'Submit storyboard',awaiting_storyboard_approval:'Approve storyboard',preparing:'Prepare and verify scene/audio assets',awaiting_asset_approval:'Approve generated assets',ready_to_render:'Start rendering',rendering:'Verify final export',awaiting_export_approval:'Approve final export',complete:'Download export',failed:'Review failure and retry',cancelled:'No further actions'};
 return steps[w.status]??'Unknown';
}
