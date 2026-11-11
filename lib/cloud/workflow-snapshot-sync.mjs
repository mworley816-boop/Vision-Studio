import {LIMITS,assertCents} from '../budget.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES=new Set(['draft','awaiting_storyboard_approval','preparing','awaiting_asset_approval','ready_to_render','rendering','awaiting_export_approval','complete','failed','cancelled']);
const MODES=new Set(['automatic','approval']);
const requiredUuid=(value,name)=>{if(typeof value!=='string'||!UUID.test(value))throw Error(`Invalid ${name}`);return value;};

/** Converts a validated local workflow to the strict database snapshot shape.
 * Snapshot synchronization does not authorize generation, render, or spending.
 */
export function workflowSnapshot({workflow,ownerId}){
 if(!workflow||typeof workflow!=='object')throw Error('Invalid workflow');
 requiredUuid(ownerId,'owner');
 for(const field of ['id','projectId','productionId'])requiredUuid(workflow[field],field);
 if(workflow.exportAssetId!==null&&workflow.exportAssetId!==undefined)requiredUuid(workflow.exportAssetId,'export asset');
 if(!(workflow.kind in LIMITS)||!MODES.has(workflow.mode)||!STATES.has(workflow.status))throw Error('Invalid workflow metadata');
 if(!Number.isSafeInteger(workflow.version)||workflow.version<0)throw Error('Invalid workflow version');
 assertCents(workflow.spentCents);assertCents(workflow.reservedCents);
 if(workflow.spentCents+workflow.reservedCents>LIMITS[workflow.kind])throw Error('Budget cap exceeded');
 return Object.freeze({id:workflow.id,ownerId,projectId:workflow.projectId,productionId:workflow.productionId,
  kind:workflow.kind,mode:workflow.mode==='automatic'?'auto':'approval',status:workflow.status,
  version:workflow.version,spentCents:workflow.spentCents,reservedCents:workflow.reservedCents,
  exportAssetId:workflow.exportAssetId??null});
}

/** A server-only transaction executor must verify the authenticated owner and
 * enforce the project/production relationship in the same transaction.
 * Version 0 inserts; later versions require exact previous version.
 */
export function createWorkflowSnapshotWriter({transaction}){
 if(typeof transaction!=='function')throw Error('Trusted transaction executor required');
 return {
  async sync({actor,ownerId,workflow}){
   if(!actor?.authenticated||actor.id!==ownerId)throw Error('Not authorized');
   const s=workflowSnapshot({workflow,ownerId});
   if(s.version===0&&s.status!=='draft')throw Error('Invalid initial snapshot');
   return transaction(async(query)=>{
    if(typeof query!=='function')throw Error('Invalid transaction executor');
    // Reject cross-project and cross-owner associations before any write.
    const ownership=await query('SELECT 1 FROM public.studio_productions WHERE id=$1 AND owner_id=$2 AND project_id=$3 AND kind=$4 AND mode=$5 FOR UPDATE',
     [s.productionId,s.ownerId,s.projectId,s.kind,s.mode]);
    if(ownership?.rows?.length!==1)throw Error('Production ownership mismatch');
    const values=[s.id,s.ownerId,s.projectId,s.productionId,s.kind,s.mode,s.status,s.version,s.spentCents,s.reservedCents,s.exportAssetId];
    let result;
    if(s.version===0){
     result=await query(`INSERT INTO public.studio_workflow_snapshots (id,owner_id,project_id,production_id,kind,mode,status,version,spent_cents,reserved_cents,export_asset_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING RETURNING id`,values);
    }else{
     result=await query(`UPDATE public.studio_workflow_snapshots SET status=$7,version=$8,spent_cents=$9,reserved_cents=$10,export_asset_id=$11
       WHERE id=$1 AND owner_id=$2 AND project_id=$3 AND production_id=$4 AND kind=$5 AND mode=$6 AND version=$12 RETURNING id`,
      [...values,s.version-1]);
    }
    if(result?.rows?.length!==1)throw Error('Stale or conflicting workflow snapshot');
    return {id:s.id,version:s.version,synced:true};
   });
  }
 };
}
