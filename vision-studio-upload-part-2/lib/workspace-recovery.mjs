import {NEXT_ATOMIC_KEY,NEXT_WORKSPACE_KEYS} from './next-workspace-storage.mjs';
import {ATOMIC_KEY} from '../preview/atomic-workspace.mjs';
/** Export raw data without parsing it: corrupted snapshots must remain recoverable. */
export function collectWorkspaceRecovery(storage){
  const keys=[NEXT_ATOMIC_KEY,...Object.values(NEXT_WORKSPACE_KEYS),ATOMIC_KEY];
  const records={};
  for(const key of keys){const value=storage.getItem(key);if(value!==null)records[key]=value;}
  if(Object.keys(records).length===0)throw Error('No saved workspace records were found.');
  return {format:'vision-studio-raw-recovery',version:1,exportedAt:new Date().toISOString(),records};
}
export function recoveryFileName(){return 'vision-studio-recovery-'+new Date().toISOString().slice(0,10)+'.json';}
