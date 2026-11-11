// Complete offline workspace backup. V1 project-only backups remain importable.
import {createBackup,parseBackup,validateProjects} from './backup.mjs';
import {validateProductions} from './workspace-bridge.mjs';
export const WORKSPACE_FORMAT='vision-studio-workspace-v2';
export function createWorkspaceBackup(projects,productions){
 const validProjects=validateProjects(projects);
 const validProductions=validateProductions(productions,validProjects);
 return {format:WORKSPACE_FORMAT,exportedAt:new Date().toISOString(),projects:validProjects,productions:validProductions};
}
export function parseWorkspaceBackup(text){
 if(typeof text!=='string'||text.length>2000000)throw Error('Backup file too large');
 let parsed;try{parsed=JSON.parse(text);}catch{throw Error('Backup is not valid JSON');}
 if(parsed?.format==='vision-studio-preview-v1')return {projects:parseBackup(text),productions:[],legacy:true};
 if(parsed?.format!==WORKSPACE_FORMAT)throw Error('Unsupported backup format');
 const projects=validateProjects(parsed.projects);
 const productions=validateProductions(parsed.productions,projects);
 return {projects,productions,legacy:false};
}
