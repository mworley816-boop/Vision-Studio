/** Import offline v3 drafts into an empty Next.js workspace without deleting the source. */
import {loadAtomicWorkspace,ATOMIC_KEY} from '../preview/atomic-workspace.mjs';
import {hasNextWorkspace,loadNextWorkspace,saveNextWorkspace} from './next-workspace-storage.mjs';
import {createVisualBible} from './visual-bible.mjs';
export function migrateOfflineToNext(storage){
  // Existing Next data (including damaged records) must never be overwritten.
  if(hasNextWorkspace(storage))return {migrated:false,reason:'next-workspace-exists'};
  if(storage.getItem(ATOMIC_KEY)===null)return {migrated:false,reason:'no-offline-workspace'};
  const offline=loadAtomicWorkspace(storage); // throws on invalid input: fail closed
  const projects=offline.projects.map(p=>({...p,createdAt:new Date(0).toISOString()}));
  const productions=offline.productions.map(p=>({...p,createdAt:new Date(0).toISOString()}));
  const bibles=projects.map(p=>createVisualBible(p.id));
  const data={projects,productions,bibles};
  // Validate against Next's schema before writing anything.
  // saveNextWorkspace validates the complete snapshot before a single atomic write.
  saveNextWorkspace(storage,data);
  return {migrated:true,projects:projects.length,productions:productions.length};
}
