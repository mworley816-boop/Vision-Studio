import {normalizeStoryboard} from './visual-editor.mjs';
import {sceneContinuityBrief} from './scene-continuity-brief.mjs';
const camera=['Wide establishing shot','Medium action shot','Close-up detail shot'];
export function sceneShotPlan(document,sceneId,bible={}){
 const scenes=normalizeStoryboard(document).scenes;
 const index=scenes.findIndex(scene=>scene.id===sceneId);
 if(index<0)throw new Error('Scene not found');
 const scene=scenes[index];
 const duration=Number(scene.duration||0);
 const shots=duration>=12?3:duration>=6?2:1;
 const base=Math.floor(duration/shots*10)/10;
 const durations=Array.from({length:shots},(_,i)=>i===shots-1?Number((duration-base*(shots-1)).toFixed(1)):base);
 const lines=['SHOT PLAN · SCENE '+(index+1),'Total duration: '+duration+' seconds','Scene action: '+String(scene.description||'').trim(),''];
 durations.forEach((seconds,i)=>{lines.push('Shot '+(i+1)+' · '+seconds+'s · '+camera[i]);lines.push('Camera movement: To be chosen by creator');lines.push('Action: '+String(scene.description||'').trim());lines.push('');});
 lines.push(sceneContinuityBrief(document,sceneId,bible));
 lines.push('Shot suggestions are editable planning guidance only; no provider quote, video, or payment has been created.');
 return {sceneNumber:index+1,duration,shots:durations.map((seconds,i)=>({number:i+1,duration:seconds,framing:camera[i]})),text:lines.join('\n')};
}
