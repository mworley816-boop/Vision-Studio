/** Fail closed: only an enrolled, authenticated owner can access studio data. */
export async function requireStudioOwner(supabase) {
  if (!supabase?.auth?.getUser) throw new Error('Authentication is not configured');
  const {data: auth, error: authError} = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Authentication required');
  const {data, error} = await supabase.from('studio_owners').select('user_id').eq('user_id', auth.user.id).maybeSingle();
  if (error || data?.user_id !== auth.user.id) throw new Error('Studio owner access required');
  return auth.user.id;
}
export function productionBudgetCents(kind) {
  if (kind === 'music') return 500;
  if (kind === 'episode') return 2000;
  throw new Error('Unsupported production type');
}
export function privateAssetPath(ownerId, projectId, fileId, extension) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (![ownerId,projectId,fileId].every(x => typeof x === 'string' && uuid.test(x))) throw new Error('Invalid asset identifiers');
  if (!/^(mp3|wav|mp4|png|jpg|webp)$/i.test(extension)) throw new Error('Unsupported asset extension');
  return `${ownerId}/${projectId}/${fileId}.${extension.toLowerCase()}`;
}
export async function createCloudProject(supabase, project) {
  const ownerId = await requireStudioOwner(supabase);
  if (!['music','series'].includes(project?.kind) || !project?.title?.trim()) throw new Error('Invalid project');
  const {data,error} = await supabase.from('studio_projects').insert({owner_id:ownerId,title:project.title.trim(),kind:project.kind}).select('id,title,kind').single();
  if (error) throw error;
  return data;
}
