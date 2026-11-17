import {requireStudioOwner,productionBudgetCents} from './owner-access.mjs';
import {projectProductionKindsMatch} from './project-production-kind.mjs';
/** Server-side creation helper. Does not create jobs, reserve funds, or call providers. */
export async function createCloudProduction(supabase,{projectId,title,kind}={}){
 if(typeof projectId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId))throw Error('Invalid project identifier');
 if(typeof title!=='string'||!title.trim()||title.trim().length>160)throw Error('Invalid production title');
 if(kind!=='music'&&kind!=='episode')throw Error('Invalid production type');
 const ownerId=await requireStudioOwner(supabase);
 const {data:project,error:projectError}=await supabase.from('studio_projects').select('id,owner_id,kind').eq('id',projectId).eq('owner_id',ownerId).maybeSingle();
 if(projectError||!project||project.id!==projectId||project.owner_id!==ownerId)throw Error('Project unavailable or access denied');
 if(!projectProductionKindsMatch(project.kind,kind))throw Error('Project and production types do not match');
 const {data,error}=await supabase.from('studio_productions').insert({owner_id:ownerId,project_id:projectId,title:title.trim(),kind,budget_cents:productionBudgetCents(kind)}).select('id,project_id,kind,budget_cents').single();
 if(error||!data)throw Error('Production creation unavailable');
 return data;
}
