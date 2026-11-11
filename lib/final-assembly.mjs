/** Local-only audio/video assembly; never calls paid providers. */
import path from 'node:path';
import {access,rm} from 'node:fs/promises';
import {executeAudioMix} from './audio-mixer.mjs';
import {executeRender,probeMedia} from './render-runner.mjs';

export function prepareFinalAssembly({renderPlan,audioMixPlan}={}) {
 if(renderPlan?.status!=='ready_to_render'||!Array.isArray(renderPlan.inputs)||!renderPlan.inputs.length) throw Error('Valid video render plan required');
 if(!audioMixPlan||!Array.isArray(audioMixPlan.tracks))throw Error('Valid audio mix plan required');
 if(!path.isAbsolute(renderPlan.outputPath)||!path.isAbsolute(audioMixPlan.outputPath))throw Error('Absolute output paths required');
 if(renderPlan.outputPath===audioMixPlan.outputPath)throw Error('Audio and video output paths must differ');
 if(renderPlan.audioPath && path.resolve(renderPlan.audioPath)!==path.resolve(audioMixPlan.outputPath))throw Error('Video audio path must match mixed audio output');
 if(Math.abs(renderPlan.targetDurationSeconds-audioMixPlan.runtimeSeconds)>.02)throw Error('Audio and video runtimes must match');
 if(audioMixPlan.tracks.some(t=>path.resolve(t.file)===path.resolve(renderPlan.outputPath)))throw Error('Output cannot be audio input');
 return {renderPlan:{...renderPlan,audioPath:audioMixPlan.outputPath},audioMixPlan};
}
export async function executeFinalAssembly(plan,{ffmpeg='ffmpeg',ffprobe='ffprobe',signal,onProgress,keepMixedAudio=true}={}) {
 if(!plan?.renderPlan||!plan?.audioMixPlan)throw Error('Prepared assembly required');
 // Revalidate even if caller mutates the plan after preparation.
 const prepared=prepareFinalAssembly(plan);
 const audioOutput=prepared.audioMixPlan.outputPath;
 let createdAudio=false;
 try {
  await executeAudioMix(prepared.audioMixPlan,{ffmpeg,ffprobe,signal});
  createdAudio=true;
  onProgress?.({stage:'audio_complete',percent:30});
  const result=await executeRender(prepared.renderPlan,{ffmpeg,ffprobe,signal,onProgress:p=>onProgress?.({stage:'video',percent:30+Math.round(p.percent*.7)})});
  const info=await probeMedia(result.outputPath,{ffprobe,signal});
  if(!info.audio||!info.video)throw Error('Final export must contain both video and audio');
  onProgress?.({stage:'complete',percent:100});
  return {...result,audioOutputPath:audioOutput};
 } catch(error) {
  if(createdAudio&&!keepMixedAudio)await rm(audioOutput,{force:true}).catch(()=>{});
  throw error;
 }
}
