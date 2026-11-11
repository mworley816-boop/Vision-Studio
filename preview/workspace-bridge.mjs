// Offline-only bridge to the actual Vision Studio workspace domain module.
import {createProduction,addScene,approveScene,canBegin,projectProductions} from '../lib/workspace.mjs';
const KEY='vision-studio-offline-productions-v1';
const validId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
export function validateProductions(items,projects){
 if(!Array.isArray(items)||items.length>1000)throw Error('Invalid production list');
 const projectById=new Map(projects.map(p=>[p.id,p]));const ids=new Set();
 return items.map(p=>{
  if(!p||!validId(p.id)||ids.has(p.id)||!projectById.has(p.projectId))throw Error('Invalid production ownership or ID');ids.add(p.id);
  if(!['music','episode'].includes(p.kind)||p.kind!==projectById.get(p.projectId).kind||typeof p.title!=='string'||!p.title.trim()||p.title.length>100||p.status!=='draft'||p.spentCents!==0||p.reservedCents!==0||!Array.isArray(p.scenes)||p.scenes.length>100)throw Error('Invalid offline production');
  const sceneIds=new Set();const scenes=p.scenes.map(s=>{if(!s||!validId(s.id)||sceneIds.has(s.id)||typeof s.description!=='string'||!s.description.trim()||s.description.length>500||typeof s.approved!=='boolean')throw Error('Invalid scene');sceneIds.add(s.id);return {id:s.id,description:s.description.trim(),approved:s.approved};});
  return {...createProduction(p.projectId,p.kind,p.title,p.id),scenes};
 });
}
export function loadProductions(storage,projects){try{return validateProductions(JSON.parse(storage.getItem(KEY)||'[]'),projects);}catch{return [];}}
export function saveProductions(storage,productions,projects){storage.setItem(KEY,JSON.stringify(validateProductions(productions,projects)));}
export function newProduction(project,existing,id){if(!project||!validId(id)||existing.some(p=>p.id===id))throw Error('Invalid production');return createProduction(project.id,project.kind,project.name,id);}
export function newScene(production,id,description){if(!validId(id)||production.scenes.some(s=>s.id===id)||typeof description!=='string'||description.length>500)throw Error('Invalid scene');return addScene(production,{id,description});}
export function setSceneApproval(production,id,approved){if(!production.scenes.some(s=>s.id===id)||typeof approved!=='boolean')throw Error('Unknown scene');return approveScene(production,id,approved);}
export function getProjectProductions(productions,id){return projectProductions(productions,id);}
export function planningReady(production,mode){return canBegin(production,mode);}
