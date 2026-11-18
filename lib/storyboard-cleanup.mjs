import {normalizeStoryboard,deleteScene} from './visual-editor.mjs';
export function storyboardCleanupReport(document,{targetScenes=12,targetSeconds=180}={}){
 const scenes=normalizeStoryboard(document).scenes;
 const total=scenes.reduce((sum,s)=>sum+Number(s.duration||0),0);
 const duplicateDescriptions=new Map();
 for(const [index,scene] of scenes.entries()){const key=String(scene.description||'').trim().toLowerCase().replace(/\s+/g,' ');if(!key)continue;const existing=duplicateDescriptions.get(key)||[];existing.push(index+1);duplicateDescriptions.set(key,existing);}
 return {count:scenes.length,total,extraScenes:scenes.length-targetScenes,extraSeconds:Math.round((total-targetSeconds)*10)/10,duplicates:[...duplicateDescriptions.values()].filter(group=>group.length>1)};
}
export function previewSceneRemoval(document,id){
 const scenes=normalizeStoryboard(document).scenes;
 const index=scenes.findIndex(s=>s.id===id);
 if(index<0)throw new Error('Scene no longer exists');
 const scene=scenes[index];
 const updated=deleteScene(document,id);
 return {sceneNumber:index+1,description:scene.description,duration:scene.duration,approved:Boolean(scene.approved),report:storyboardCleanupReport(updated),updated};
}
