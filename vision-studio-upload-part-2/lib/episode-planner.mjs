import {normalizeBible} from './visual-editor.mjs';

const RUNTIMES={music:180,series:420};
const CAMERA=['Wide establishing shot','Medium tracking shot','Close-up','Over-the-shoulder','Slow push-in','Reaction shot'];
const MUSIC_SECTIONS=['intro','verse','pre-chorus','chorus','verse','chorus','bridge','final chorus','outro'];

function text(value,max=8000){return String(value??'').trim().slice(0,max)}
function segmentScript(script){
 const lines=text(script).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const beats=[];
 for(const line of lines){
  const match=line.match(/^([\p{L}][\p{L}0-9 _-]{0,38}):\s*(.+)$/u);
  if(match)beats.push({type:'dialogue',speaker:match[1].trim(),content:match[2].trim()});
  else if(/^\[(narration|voiceover)\]/i.test(line))beats.push({type:'narration',speaker:'Narrator',content:line.replace(/^\[(narration|voiceover)\]\s*/i,'')});
  else beats.push({type:'action',speaker:null,content:line});
 }
 return beats;
}
function durations(runtime,count){const ticks=runtime*10;const base=Math.floor(ticks/count);return Array.from({length:count},(_,i)=>(base+(i<ticks%count?1:0))/10)}
function chooseCharacter(beat,characters){return characters.find(c=>c.name?.toLowerCase()===beat.speaker?.toLowerCase())}
function sceneDescription(beat,kind,index){return `${CAMERA[index%CAMERA.length]}. ${beat.content}`.slice(0,3000)}
export function planStructuredProduction({kind,script,bible={},sceneCount=14,mode='approval',songSections=[]}){
 if(!Object.hasOwn(RUNTIMES,kind))throw new Error('Unknown production type');
 if(!['approval','auto'].includes(mode))throw new Error('Invalid production mode');
 const source=text(script);if(source.length<12||source.length>8000)throw new Error('Provide a script or concept of 12–8000 characters');
 const count=Number(sceneCount);if(!Number.isInteger(count)||count<2||count>60)throw new Error('Scene count must be 2–60');
 const visual=normalizeBible(bible);const beats=segmentScript(source);
 const sections=kind==='music'?(songSections.length?songSections:MUSIC_SECTIONS):[];
 if(kind==='music' && (!Array.isArray(sections)||sections.some(s=>!['intro','verse','pre-chorus','chorus','bridge','outro','final chorus','instrumental'].includes(s))))throw new Error('Invalid song section');
 const times=durations(RUNTIMES[kind],count);
 const warnings=[];
 if(!visual.characters.length)warnings.push('No character references configured');
 if(!visual.locations.length)warnings.push('No location references configured');
 const unknown=new Set();
 const scenes=times.map((duration,i)=>{
  const beat=beats[i%beats.length];const character=chooseCharacter(beat,visual.characters);
  if(beat.type==='dialogue'&&!character)unknown.add(beat.speaker);
  const location=visual.locations[i%visual.locations.length];
  const objective=kind==='series'?['Establish the situation','Advance the conflict','Show a character choice','Build toward resolution','Resolve the beat'][Math.min(4,Math.floor(i/count*5))]:`Visualize ${sections[Math.min(sections.length-1,Math.floor(i/count*sections.length))]}`;
  return {id:crypto.randomUUID(),duration,description:sceneDescription(beat,kind,i),shotType:CAMERA[i%CAMERA.length],objective,beatType:beat.type,dialogue:beat.type==='dialogue'?{speaker:beat.speaker,text:beat.content}:null,narration:beat.type==='narration'?beat.content:'',musicSection:kind==='music'?sections[Math.min(sections.length-1,Math.floor(i/count*sections.length))]:null,characterIds:character?[character.id]:[],locationId:location?.id??'',approved:false,directorNotes:`Match the Visual Bible: ${visual.style||'style unset'}; ${visual.palette||'palette unset'}. Preserve identities and scene geography.`};
 });
 for(const speaker of unknown)warnings.push(`Dialogue speaker “${speaker}” has no matching character in this project's Visual Bible`);
 return {kind,mode,runtime:RUNTIMES[kind],source:'offline-structured-planner',requiresApproval:mode==='approval',storyboard:{scenes},warnings};
}
export function verifyStructuredPlan(plan){return Object.hasOwn(RUNTIMES,plan?.kind)&&Array.isArray(plan?.storyboard?.scenes)&&plan.storyboard.scenes.length>0&&plan.storyboard.scenes.every(s=>Number.isFinite(s.duration)&&s.duration>0&&s.approved===false)&&Math.abs(plan.storyboard.scenes.reduce((sum,s)=>sum+s.duration,0)-RUNTIMES[plan.kind])<0.001;}
