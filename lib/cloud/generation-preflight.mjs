import {cloudStoryboardReadiness,normalizeStoryboard} from '../visual-editor.mjs';
/** Read-only server preflight. This is not authorization to submit paid work. */
export async function inspectCloudGenerationPreflight(client,{projectId,productionId}) {
 if(!client?.from)throw new Error('Authenticated database client required');
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user?.id)throw new Error('Authentication required');
 const {data:owner,error:ownerError}=await client.from('studio_owners').select('user_id').eq('user_id',user.id).maybeSingle();
 if(ownerError||owner?.user_id!==user.id)throw new Error('Studio owner access required');
 const [projectResult,productionResult]=await Promise.all([
  client.from('studio_projects').select('visual_bible,revision').eq('id',projectId).eq('owner_id',user.id).single(),
  client.from('studio_productions').select('storyboard,revision,budget_cents,kind').eq('id',productionId).eq('project_id',projectId).eq('owner_id',user.id).single()
 ]);
 if(projectResult.error||productionResult.error||!projectResult.data||!productionResult.data)throw new Error('Production unavailable');
 const project=projectResult.data,production=productionResult.data;
 const readiness=cloudStoryboardReadiness(production.storyboard,project.visual_bible);
 const missingSnapshots=normalizeStoryboard(production.storyboard).scenes.flatMap((scene,index)=>scene.approved&&!scene.referenceSnapshot?[`Scene ${index+1} needs reapproval with current references.`]:[]);
 const issues=[...readiness.issues,...missingSnapshots];
 return {ready:issues.length===0,issues,projectRevision:project.revision,productionRevision:production.revision,budgetCapCents:production.budget_cents,generationEnabled:false};
}
