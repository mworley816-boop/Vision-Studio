import {prepareCloudGeneration} from './generation-preparation.mjs';
/** Owner-scoped non-spending review history. A review is NOT permission to queue paid work. */
export async function saveGenerationApprovalReview(client,{projectId,productionId,projectRevision,productionRevision,requestedMaxCents,confirmed}={}){
 if(confirmed!==true)throw new Error('Explicit acknowledgment required');
 const prepared=await prepareCloudGeneration(client,{projectId,productionId,projectRevision,productionRevision,requestedMaxCents});
 if(prepared.status!=='planning_only'||prepared.generationEnabled!==false||prepared.reservationCreated!==false)throw new Error('Unsafe preparation');
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user?.id)throw new Error('Authentication required');
 const record={owner_id:user.id,project_id:projectId,production_id:productionId,project_revision:projectRevision,production_revision:productionRevision,maximum_cost_cents:requestedMaxCents,decision:'reviewed_only'};
 const {data,error}=await client.from('studio_generation_approval_reviews').insert(record).select('id,decision,created_at,project_revision,production_revision,maximum_cost_cents').single();
 if(error?.code==='23505')throw new Error('This exact review has already been saved. View saved review history.');
 if(error||!data?.id||data.decision!=='reviewed_only')throw new Error('Approval review storage unavailable');
 return {status:'review_saved_only',record:data,jobCreated:false,paymentAuthorized:false};
}
export async function listGenerationApprovalReviews(client,{projectId,productionId}={}){
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user?.id)throw new Error('Authentication required');
 const {data:owner,error:ownerError}=await client.from('studio_owners').select('user_id').eq('user_id',user.id).maybeSingle();
 if(ownerError||owner?.user_id!==user.id)throw new Error('Owner required');
 const {data:project,error:projectError}=await client.from('studio_projects').select('id').eq('id',projectId).eq('owner_id',user.id).single();
 const {data:production,error:productionError}=await client.from('studio_productions').select('id').eq('id',productionId).eq('project_id',projectId).eq('owner_id',user.id).single();
 if(projectError||productionError||!project||!production)throw new Error('Production unavailable');
 const {data,error}=await client.from('studio_generation_approval_reviews').select('id,decision,created_at,project_revision,production_revision,maximum_cost_cents').eq('owner_id',user.id).eq('production_id',productionId).order('created_at',{ascending:false}).limit(20);
 if(error)throw new Error('Approval review storage unavailable');
 return {status:'history',records:data??[],generationEnabled:false};
}
