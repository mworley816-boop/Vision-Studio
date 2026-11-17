import {productionBudgetIsValid} from './production-budget-integrity.mjs';
import {projectProductionKindsMatch} from './project-production-kind.mjs';
import {cloudStoryboardReadiness,normalizeStoryboard,sceneReferenceSnapshot} from '../visual-editor.mjs';
/** Read-only server preflight. This is not authorization to submit paid work. */
export async function inspectCloudGenerationPreflight(client,{projectId,productionId}) {
 if(!client?.from)throw new Error('Authenticated database client required');
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user?.id)throw new Error('Authentication required');
 const {data:owner,error:ownerError}=await client.from('studio_owners').select('user_id').eq('user_id',user.id).maybeSingle();
 if(ownerError||owner?.user_id!==user.id)throw new Error('Studio owner access required');
 const [projectResult,productionResult]=await Promise.all([
  client.from('studio_projects').select('visual_bible,revision,kind').eq('id',projectId).eq('owner_id',user.id).single(),
  client.from('studio_productions').select('storyboard,revision,budget_cents,kind').eq('id',productionId).eq('project_id',projectId).eq('owner_id',user.id).single()
 ]);
 if(projectResult.error||productionResult.error||!projectResult.data||!productionResult.data)throw new Error('Production unavailable');
 const project=projectResult.data,production=productionResult.data;
 const readiness=cloudStoryboardReadiness(production.storyboard,project.visual_bible);
 const missingSnapshots=normalizeStoryboard(production.storyboard).scenes.flatMap((scene,index)=>scene.approved&&!scene.referenceSnapshot?[`Scene ${index+1} needs reapproval with current references.`]:[]);
 const mismatches=normalizeStoryboard(production.storyboard).scenes.flatMap((scene,index)=>{
  if(!scene.approved||!scene.referenceSnapshot)return [];
  const expected=sceneReferenceSnapshot(scene,project.visual_bible);
  const actual=scene.referenceSnapshot;
  const problems=[];
  if(!Array.isArray(actual.characters)||actual.characters.length!==expected.characters.length||expected.characters.some(c=>!actual.characters.some(a=>a.id===c.id&&(a.referenceAssetId||'')===c.referenceAssetId)))problems.push('character reference images');
  if(actual.locationId!==expected.locationId||actual.locationReferenceAssetId!==expected.locationReferenceAssetId)problems.push('location reference');
  if(actual.sceneReferenceAssetId!==expected.sceneReferenceAssetId)problems.push('scene reference image');
  return problems.length?['Scene '+(index+1)+': saved approval differs from the saved Visual Bible ('+problems.join(', ')+'). Save the Visual Bible, then approve and save the scene again.']:[];
 });
 const budgetIssues=productionBudgetIsValid(production.kind,production.budget_cents)?[]:['Production type and saved budget cap do not match. Generation remains blocked.'];
 const kindIssues=projectProductionKindsMatch(project.kind,production.kind)?[]:['Project type and production type do not match. Generation remains blocked.'];
 const issues=[...readiness.issues,...missingSnapshots,...mismatches,...budgetIssues,...kindIssues];
 return {ready:issues.length===0,issues,projectRevision:project.revision,productionRevision:production.revision,budgetCapCents:production.budget_cents,generationEnabled:false};
}
