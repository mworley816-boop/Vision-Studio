import {LIMITS} from './budget.mjs';
import {canBegin,reserveJob,settleJob} from './workspace.mjs';
import {inspectContinuity,buildShotBrief} from './visual-bible.mjs';

/** Provider-neutral, local-first production planning. Does not call paid services. */
export function createProductionPlan(production,bible,mode='approval'){
 if(!['automatic','approval'].includes(mode))throw new Error('Invalid production mode');
 if(!canBegin(production,mode))throw new Error('Scenes missing or awaiting approval');
 const audit=inspectContinuity(production,bible);
 if(!audit.ok)throw new Error(`Continuity blocked: ${audit.issues.map(x=>x.code).join(', ')}`);
 const shots=production.scenes.map(scene=>({
  ...buildShotBrief(production,scene,bible),
  status:'planned',assetIds:[],renderedPath:null
 }));
 return {id:`plan-${production.id}`,projectId:production.projectId,productionId:production.id,
  kind:production.kind,mode,status:'ready',shots,createdAt:new Date().toISOString()};
}
export function queueShot(production,plan,sceneId,jobId,estimatedCents){
 if(plan.projectId!==production.projectId||plan.productionId!==production.id)throw new Error('Plan mismatch');
 if(plan.status!=='ready'&&plan.status!=='in_progress')throw new Error('Plan not queueable');
 const shot=plan.shots.find(s=>s.sceneId===sceneId);
 if(!shot||shot.status!=='planned')throw new Error('Shot not available for queue');
 if(!Number.isSafeInteger(estimatedCents)||estimatedCents<=0)throw new Error('Positive cost estimate required');
 const updatedProduction=reserveJob(production,jobId,estimatedCents);
 return {production:updatedProduction,plan:{...plan,status:'in_progress',shots:plan.shots.map(s=>s.sceneId===sceneId?{...s,status:'reserved',jobId}:s)}};
}
export function finishShot(production,plan,sceneId,actualCents,assetId){
 const shot=plan.shots.find(s=>s.sceneId===sceneId);
 if(!shot||shot.status!=='reserved')throw new Error('Shot is not reserved');
 if(!assetId?.trim())throw new Error('Generated asset ID required');
 const updatedProduction=settleJob(production,shot.jobId,actualCents);
 const shots=plan.shots.map(s=>s.sceneId===sceneId?{...s,status:'generated',assetIds:[...s.assetIds,assetId]}:s);
 return {production:updatedProduction,plan:{...plan,shots,status:shots.every(s=>s.status==='generated')?'assets_ready':'in_progress'}};
}
export function cancelShot(production,plan,sceneId){
 const shot=plan.shots.find(s=>s.sceneId===sceneId);
 if(!shot||shot.status!=='reserved')throw new Error('Shot is not reserved');
 const job=(production.jobs||[]).find(j=>j.id===shot.jobId&&j.status==='reserved');
 if(!job)throw new Error('Reservation missing');
 return {production:{...production,reservedCents:production.reservedCents-job.estimatedCents,jobs:production.jobs.map(j=>j.id===job.id?{...j,status:'cancelled'}:j)},plan:{...plan,shots:plan.shots.map(s=>s.sceneId===sceneId?{...s,status:'planned',jobId:null}:s)}};
}
export function renderManifest(production,plan){
 if(plan.productionId!==production.id||plan.projectId!==production.projectId)throw new Error('Plan mismatch');
 if(plan.status!=='assets_ready')throw new Error('All scenes must have generated assets');
 if(production.reservedCents!==0)throw new Error('Outstanding cost reservations');
 return {projectId:production.projectId,productionId:production.id,kind:production.kind,
  targetDurationSeconds:production.kind==='music'?180:420,
  scenes:plan.shots.map(s=>({sceneId:s.sceneId,assetIds:s.assetIds,description:s.description})),
  budget:{capCents:LIMITS[production.kind],spentCents:production.spentCents},
  status:'awaiting_renderer'};
}
