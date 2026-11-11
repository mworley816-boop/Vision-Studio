import {validateProjects} from './backup.mjs';
// Immutable, locally validated edits. Production type cannot change after creation:
// a different type carries different duration and spending constraints.
export function renameProject(projects,id,newName){
  if(typeof newName!=='string'||!newName.trim()||newName.length>100)throw Error('Project name must be 1–100 characters');
  const existing=validateProjects(projects);
  if(!existing.some(p=>p.id===id))throw Error('Project not found');
  return validateProjects(existing.map(p=>p.id===id?{...p,name:newName.trim()}:p));
}
export function changePlanningMode(projects,id,newMode){
  if(newMode!=='approval'&&newMode!=='automatic')throw Error('Invalid planning mode');
  const existing=validateProjects(projects);
  if(!existing.some(p=>p.id===id))throw Error('Project not found');
  return validateProjects(existing.map(p=>p.id===id?{...p,mode:newMode}:p));
}
