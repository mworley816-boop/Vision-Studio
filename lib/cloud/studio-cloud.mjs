// Authenticated Supabase client adapter. No service-role credentials are used.
export const STUDIO_BUCKET = 'vision-private';
export function assertOwnerId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error('Invalid owner identifier');
  return value;
}
export function validateUpload({ownerId, projectId, fileName, bytes, mime}) {
  assertOwnerId(ownerId); assertOwnerId(projectId);
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > 100 * 1024 * 1024) throw new Error('File exceeds 100 MB limit');
  const allowed = new Set(['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','image/png','image/jpeg','image/webp','video/mp4']);
  if (!allowed.has(mime)) throw new Error('Unsupported media type');
  if (typeof fileName !== 'string' || !fileName.trim()) throw new Error('Invalid filename');
  const extension = {'audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav','audio/mp4':'m4a','image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/mp4':'mp4'}[mime];
  const randomId = crypto.randomUUID();
  return `${ownerId}/${projectId}/${randomId}.${extension}`;
}
export async function requireStudioOwner(client) {
  const {data:{user},error:authError} = await client.auth.getUser();
  if (authError || !user) throw new Error('Sign in required');
  const {data,error} = await client.from('studio_owners').select('user_id').eq('user_id',user.id).maybeSingle();
  if (error || !data || data.user_id !== user.id) throw new Error('Studio access denied');
  return user;
}
export async function listCloudProjects(client) {
  const user = await requireStudioOwner(client);
  const {data,error} = await client.from('studio_projects').select('id,title,kind,visual_bible,created_at').eq('owner_id',user.id).order('created_at',{ascending:false});
  if (error) throw new Error('Unable to load projects');
  return data;
}
export async function createCloudProject(client,{title,kind}) {
  const user = await requireStudioOwner(client);
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) throw new Error('Invalid project title');
  if (!['music','series'].includes(kind)) throw new Error('Invalid project type');
  const {data,error} = await client.from('studio_projects').insert({owner_id:user.id,title:title.trim(),kind}).select('id,title,kind').single();
  if (error) throw new Error('Unable to create project');
  return data;
}
export async function createCloudProduction(client,{projectId,title,mode='approval'}) {
  const user = await requireStudioOwner(client);
  assertOwnerId(projectId);
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) throw new Error('Invalid production title');
  if (!['auto','approval'].includes(mode)) throw new Error('Invalid production mode');
  const {data:project,error:lookupError} = await client.from('studio_projects').select('id,kind').eq('id',projectId).eq('owner_id',user.id).single();
  if (lookupError || !project) throw new Error('Project unavailable');
  const kind = project.kind === 'series' ? 'episode' : 'music';
  const budget_cents = kind === 'episode' ? 2000 : 500;
  const {data,error} = await client.from('studio_productions').insert({project_id:projectId,owner_id:user.id,title:title.trim(),mode,kind,budget_cents}).select('id,title,kind,budget_cents').single();
  if (error) throw new Error('Unable to create production');
  return data;
}
export async function uploadPrivateAsset(client,{projectId,file}) {
  const user = await requireStudioOwner(client);
  const {data:project,error:projectError} = await client.from('studio_projects').select('id').eq('id',projectId).eq('owner_id',user.id).single();
  if (projectError || !project) throw new Error('Project unavailable');
  const path = validateUpload({ownerId:user.id,projectId,fileName:file.name,bytes:file.size,mime:file.type});
  const {error:uploadError} = await client.storage.from(STUDIO_BUCKET).upload(path,file,{contentType:file.type,upsert:false});
  if (uploadError) throw new Error('Private upload failed');
  const {data,error} = await client.from('studio_assets').insert({owner_id:user.id,project_id:projectId,storage_path:path,media_type:file.type}).select('id,storage_path').single();
  if (error) {
    await client.storage.from(STUDIO_BUCKET).remove([path]).catch(()=>{});
    throw new Error('Asset registration failed');
  }
  return data;
}

// Phase 11: per-project cloud documents with optimistic concurrency.
export function validateDocument(value, kind) {
  const max = kind === 'bible' ? 100_000 : 300_000;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Document must be an object');
  const json = JSON.stringify(value);
  if (!json || new TextEncoder().encode(json).length > max) throw new Error('Document too large');
  if (kind === 'storyboard') {
    if (!Array.isArray(value.scenes) || value.scenes.length > 200) throw new Error('Storyboard requires up to 200 scenes');
    for (const scene of value.scenes) {
      if (!scene || typeof scene !== 'object' || typeof scene.description !== 'string' || scene.description.length > 3000 || !Number.isFinite(scene.duration) || scene.duration <= 0 || scene.duration > 420) throw new Error('Invalid storyboard scene');
    }
  }
  return value;
}
export async function listCloudProductions(client, projectId) {
  const user = await requireStudioOwner(client); assertOwnerId(projectId);
  const {data,error} = await client.from('studio_productions').select('id,title,kind,mode,budget_cents,storyboard,revision').eq('owner_id',user.id).eq('project_id',projectId).order('created_at',{ascending:false});
  if (error) throw new Error('Unable to load productions');
  return data;
}
export async function loadCloudProject(client, projectId) {
  const user = await requireStudioOwner(client); assertOwnerId(projectId);
  const {data,error} = await client.from('studio_projects').select('id,title,kind,visual_bible,revision').eq('id',projectId).eq('owner_id',user.id).single();
  if (error || !data) throw new Error('Project unavailable');
  return data;
}
export async function saveVisualBible(client,{projectId,visualBible,revision}) {
  const user = await requireStudioOwner(client); assertOwnerId(projectId);
  validateDocument(visualBible,'bible');
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid revision');
  const {data,error} = await client.from('studio_projects').update({visual_bible:visualBible,revision:revision+1}).eq('id',projectId).eq('owner_id',user.id).eq('revision',revision).select('revision').maybeSingle();
  if (error) throw new Error('Visual Bible save failed');
  if (!data) throw new Error('Project changed elsewhere. Reload before saving.');
  return data;
}
export async function saveStoryboard(client,{projectId,productionId,storyboard,revision}) {
  const user = await requireStudioOwner(client); assertOwnerId(projectId); assertOwnerId(productionId);
  validateDocument(storyboard,'storyboard');
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid revision');
  const {data,error} = await client.from('studio_productions').update({storyboard,revision:revision+1}).eq('id',productionId).eq('project_id',projectId).eq('owner_id',user.id).eq('revision',revision).select('revision').maybeSingle();
  if (error) throw new Error('Storyboard save failed');
  if (!data) throw new Error('Storyboard changed elsewhere. Reload before saving.');
  return data;
}

export async function listPrivateAssets(client,projectId){
  const user=await requireStudioOwner(client);assertOwnerId(projectId);
  const {data:project,error:projectError}=await client.from('studio_projects').select('id').eq('id',projectId).eq('owner_id',user.id).single();
  if(projectError||!project)throw new Error('Project unavailable');
  const {data,error}=await client.from('studio_assets').select('id,storage_path,media_type,created_at').eq('owner_id',user.id).eq('project_id',projectId).order('created_at',{ascending:false});
  if(error)throw new Error('Unable to load private media');
  return data;
}
export async function getPrivateAssetUrl(client,asset){
  await requireStudioOwner(client);
  if(!asset||typeof asset.storage_path!=='string')throw new Error('Invalid asset');
  const {data,error}=await client.storage.from(STUDIO_BUCKET).createSignedUrl(asset.storage_path,60);
  if(error||!data?.signedUrl)throw new Error('Unable to open private media');
  return data.signedUrl;
}
