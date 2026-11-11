// Single-key persistence avoids torn project/production writes on storage quota failures.
import {validateProjects} from './backup.mjs';
import {validateProductions} from './workspace-bridge.mjs';
export const ATOMIC_KEY='vision-studio-offline-workspace-v3';
export function saveAtomicWorkspace(storage,projects,productions){
 const safeProjects=validateProjects(projects);
 const safeProductions=validateProductions(productions,safeProjects);
 storage.setItem(ATOMIC_KEY,JSON.stringify({version:3,projects:safeProjects,productions:safeProductions}));
 return {projects:safeProjects,productions:safeProductions};
}
export function loadAtomicWorkspace(storage){
 const raw=storage.getItem(ATOMIC_KEY);
 if(raw===null)return null;
 const data=JSON.parse(raw);
 if(data?.version!==3)throw Error('Unsupported workspace storage version');
 const projects=validateProjects(data.projects);
 return {projects,productions:validateProductions(data.productions,projects)};
}

// Upgrade older split-key preview data without deleting it. An invalid v3 record
// must stop migration: silently falling back could overwrite newer user work.
export function loadOrMigrateWorkspace(storage){
 const existing=loadAtomicWorkspace(storage);
 if(existing)return {workspace:existing,migrated:false};
 const projectRaw=storage.getItem('vision-studio-offline-preview-v1');
 const productionRaw=storage.getItem('vision-studio-offline-productions-v1');
 if(projectRaw===null&&productionRaw===null)return {workspace:{projects:[],productions:[]},migrated:false};
 let projects,productions;
 try{
  projects=validateProjects(JSON.parse(projectRaw??'[]'));
  productions=validateProductions(JSON.parse(productionRaw??'[]'),projects);
 }catch{throw Error('Legacy workspace is invalid; export or repair it before migration');}
 const workspace=saveAtomicWorkspace(storage,projects,productions);
 return {workspace,migrated:true};
}
