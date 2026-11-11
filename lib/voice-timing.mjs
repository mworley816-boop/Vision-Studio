/** Offline voice casting and dialogue timing; no synthetic audio is produced. */
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
export function buildVoiceCast(bible={}) {
 const cast=new Map();
 for(const character of bible.characters??[]){
  if(!character?.id||!clean(character.name))continue;
  const key=clean(character.name).toLocaleLowerCase();
  if(cast.has(key))throw new Error(`Duplicate character name: ${character.name}`);
  cast.set(key,{characterId:character.id,name:clean(character.name),voiceDescription:clean(character.voice),voiceId:clean(character.voiceId,120)||null});
 }
 return cast;
}
export function estimateSpeechSeconds(words,{wordsPerMinute=135,pauseSeconds=0.35}={}){
 if(!Number.isFinite(wordsPerMinute)||wordsPerMinute<60||wordsPerMinute>240)throw new Error('Speech rate must be 60–240 WPM');
 if(!Number.isFinite(pauseSeconds)||pauseSeconds<0||pauseSeconds>10)throw new Error('Invalid pause');
 const count=clean(words,8000).split(/\s+/).filter(Boolean).length;
 return count?Math.round((count*60/wordsPerMinute+pauseSeconds)*100)/100:0;
}
/** @param {{storyboard?: {scenes: any[]}, bible?: any, wordsPerMinute?: number}} options */
export function planDialogueTiming({storyboard,bible={},wordsPerMinute=135}={}){
 if(!Array.isArray(storyboard?.scenes))throw new Error('Storyboard scenes required');
 const cast=buildVoiceCast(bible),warnings=[],cues=[];
 let start=0;
 storyboard.scenes.forEach((scene,index)=>{
  const duration=Number(scene.duration);
  if(!Number.isFinite(duration)||duration<=0)throw new Error(`Invalid scene duration at ${index+1}`);
  const speech=scene.dialogue?.text?clean(scene.dialogue.text,8000):scene.narration?clean(scene.narration,8000):'';
  if(speech){
   const speaker=scene.dialogue?.text?clean(scene.dialogue.speaker):'Narrator';
   const actor=cast.get(speaker.toLocaleLowerCase());
   const estimatedSeconds=estimateSpeechSeconds(speech,{wordsPerMinute});
   const cue={sceneId:scene.id,sceneIndex:index,speaker,text:speech,characterId:actor?.characterId??null,voiceId:actor?.voiceId??null,startSeconds:Math.round(start*100)/100,estimatedSeconds,sceneSeconds:duration,overrunSeconds:Math.max(0,Math.round((estimatedSeconds-duration)*100)/100)};
   cues.push(cue);
   if(!actor)warnings.push(`Scene ${index+1}: ${speaker} has no voice assignment in the Visual Bible`);
   else if(!actor.voiceId)warnings.push(`Scene ${index+1}: ${speaker} needs a provider voice ID before synthesis`);
   if(cue.overrunSeconds>0)warnings.push(`Scene ${index+1}: speech exceeds scene duration by ${cue.overrunSeconds}s`);
  }
  start+=duration;
 });
 return {runtimeSeconds:Math.round(start*100)/100,cues,warnings,readyForSynthesis:warnings.length===0};
}
