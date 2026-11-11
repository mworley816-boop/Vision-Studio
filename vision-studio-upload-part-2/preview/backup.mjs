// Pure, dependency-free local preview backup validation. Never sends data to a server.
export const BACKUP_FORMAT='vision-studio-preview-v1';
const kinds=new Set(['music','episode']);
const modes=new Set(['approval','automatic']);
export function validateProjects(value){
  if(!Array.isArray(value)||value.length>500)throw Error('Backup must contain at most 500 projects');
  const seen=new Set();
  return value.map((p)=>{
    if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.id!=='string'||!(/^[a-zA-Z0-9_-]{1,100}$/.test(p.id))||seen.has(p.id))throw Error('Invalid or duplicate project ID');
    seen.add(p.id);
    if(typeof p.name!=='string'||p.name.trim().length<1||p.name.length>100||!kinds.has(p.kind)||!modes.has(p.mode))throw Error('Invalid project data');
    return {id:p.id,name:p.name.trim(),kind:p.kind,mode:p.mode};
  });
}
export function createBackup(projects){return {format:BACKUP_FORMAT,exportedAt:new Date().toISOString(),projects:validateProjects(projects)};}
export function parseBackup(text){
  if(typeof text!=='string'||text.length>500000)throw Error('Backup file too large');
  let data;try{data=JSON.parse(text);}catch{throw Error('Backup is not valid JSON');}
  if(!data||data.format!==BACKUP_FORMAT)throw Error('Unsupported backup format');
  return validateProjects(data.projects);
}
