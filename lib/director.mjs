import {normalizeBible,normalizeStoryboard} from './visual-editor.mjs';

const LIMITS={music:180,series:420};
export function planStoryboard({kind,concept,bible={},sceneCount=12,mode='approval'}) {
 if(!Object.hasOwn(LIMITS,kind))throw new Error('Unknown production type');
 if(!['approval','auto'].includes(mode))throw new Error('Invalid approval mode');
 const idea=String(concept??'').trim();
 if(idea.length<12||idea.length>8000)throw new Error('Provide a concept or script of 12–8000 characters');
 const count=Number(sceneCount);
 if(!Number.isInteger(count)||count<2||count>60)throw new Error('Scene count must be between 2 and 60');
 const visual=normalizeBible(bible), runtime=LIMITS[kind];
 const base=Math.floor(runtime*10/count)/10;
 const beats=idea.split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
 const shots=['Establishing wide shot','Medium tracking shot','Close-up reaction','Over-the-shoulder shot','Slow cinematic push-in','Wide transition shot'];
 const scenes=Array.from({length:count},(_,index)=>{
  const duration=index===count-1?Math.round((runtime-base*(count-1))*10)/10:base;
  const beat=beats[index%beats.length]??idea;
  const location=visual.locations[index%Math.max(visual.locations.length,1)];
  const characters=visual.characters.length?[visual.characters[index%visual.characters.length].id]:[];
  return {id:crypto.randomUUID(),description:`${shots[index%shots.length]}. ${beat}`,duration,locationId:location?.id??'',characterIds:characters,approved:false,shotType:shots[index%shots.length],directorNotes:`Preserve ${visual.style||'the selected visual style'}; palette ${visual.palette||'from the project Visual Bible'}.`};
 });
 return {storyboard:{scenes},runtime,kind,mode,source:'local-rule-based-draft',requiresApproval:mode==='approval',warnings:[...(!visual.characters.length?['No character references configured']:[]),...(!visual.locations.length?['No location references configured']:[])]};
}
export function validateDirectorDraft(plan){const scenes=normalizeStoryboard(plan?.storyboard).scenes;const expected=LIMITS[plan?.kind];if(!expected||!scenes.length)return false;return Math.abs(scenes.reduce((sum,s)=>sum+Number(s.duration),0)-expected)<0.01;}
