/** Local-only audio mixing. Asset IDs must be resolved to approved local paths by trusted server code. */
import {spawn} from 'node:child_process';
import {access,mkdir,rename,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {probeMedia} from './render-runner.mjs';
const EXT=new Set(['.wav','.mp3','.m4a','.aac','.flac','.ogg','.mp4']);
function safePath(p){if(typeof p!=='string'||!path.isAbsolute(p)||p.includes('\0')||p.includes('\n')||!EXT.has(path.extname(p).toLowerCase()))throw Error('Unsupported absolute audio path');return path.resolve(p);}
export function prepareAudioMix(manifest,{assetPaths,outputPath}={}){
 if(!manifest||!Array.isArray(manifest.tracks)||!Number.isFinite(manifest.runtimeSeconds)||manifest.runtimeSeconds<=0||manifest.runtimeSeconds>420)throw Error('Invalid audio manifest');
 if(!assetPaths||typeof assetPaths!=='object')throw Error('Asset path map required');
 const tracks=manifest.tracks.map(t=>{
  const file=safePath(assetPaths[t.assetId]);
  if(!t.assetId||!Number.isFinite(t.startSeconds)||t.startSeconds<0||!Number.isFinite(t.durationSeconds)||t.durationSeconds<=0||t.startSeconds+t.durationSeconds>manifest.runtimeSeconds+.01)throw Error('Invalid audio timing');
  if(!Number.isFinite(t.gainDb)||t.gainDb < -60||t.gainDb>12)throw Error('Invalid gain');
  return {file,startSeconds:t.startSeconds,durationSeconds:t.durationSeconds,gainDb:t.gainDb,assetId:t.assetId};
 });
 const output=safePath(outputPath);
 if(!['.wav','.m4a'].includes(path.extname(output).toLowerCase()))throw Error('Output must be WAV or M4A');
 if(tracks.some(t=>t.file===output))throw Error('Cannot overwrite input');
 return {tracks,outputPath:output,runtimeSeconds:manifest.runtimeSeconds};
}
export function audioMixCommand(plan,output=plan.outputPath){
 if(!plan?.tracks||!Number.isFinite(plan.runtimeSeconds))throw Error('Invalid mix plan');
 const args=['-hide_banner','-nostdin','-y'];
 for(const t of plan.tracks)args.push('-i',t.file);
 let filter;
 if(plan.tracks.length){
  const segments=plan.tracks.map((t,i)=>`[${i}:a]atrim=duration=${t.durationSeconds},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${Math.pow(10,t.gainDb/20).toFixed(8)},adelay=${Math.round(t.startSeconds*1000)}:all=1[a${i}]`);
  segments.push(`${plan.tracks.map((_,i)=>`[a${i}]`).join('')}amix=inputs=${plan.tracks.length}:duration=longest:dropout_transition=0,apad,atrim=duration=${plan.runtimeSeconds}[mix]`);
  filter=segments.join(';');
 }else{
  args.push('-f','lavfi','-i','anullsrc=r=48000:cl=stereo');
  filter=`[0:a]atrim=duration=${plan.runtimeSeconds}[mix]`;
 }
 args.push('-filter_complex',filter,'-map','[mix]');
 if(path.extname(output).toLowerCase()==='.wav')args.push('-c:a','pcm_s16le');
 else args.push('-c:a','aac','-b:a','192k');
 args.push('-t',String(plan.runtimeSeconds),output);
 return {binary:'ffmpeg',args};
}
function spawnFfmpeg(binary,args,signal){return new Promise((resolve,reject)=>{
 const child=spawn(binary,args,{stdio:['ignore','ignore','pipe'],signal,windowsHide:true});let stderr='';
 child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-4000)});
 child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(`FFmpeg failed (${code}): ${stderr.slice(-1500)}`)));
 });}
export async function executeAudioMix(plan,{ffmpeg='ffmpeg',ffprobe='ffprobe',signal}={}){
 if(!plan?.outputPath||!Array.isArray(plan.tracks))throw Error('Invalid audio mix plan');
 for(const t of plan.tracks){await access(t.file);const info=await probeMedia(t.file,{ffprobe,signal});if(!info.audio||!Number.isFinite(info.duration)||info.duration+.15<t.durationSeconds)throw Error('Input audio duration mismatch');}
 try{await access(plan.outputPath);throw Error('Output already exists')}catch(e){if(e.code!=='ENOENT')throw e}
 await mkdir(path.dirname(plan.outputPath),{recursive:true});
 const tmp=path.join(path.dirname(plan.outputPath),`.vision-audio-${randomUUID()}${path.extname(plan.outputPath)}`);
 try{
  const cmd=audioMixCommand(plan,tmp);await spawnFfmpeg(ffmpeg,cmd.args,signal);
  const info=await probeMedia(tmp,{ffprobe,signal});const stats=await stat(tmp);
  if(!info.audio||!Number.isFinite(info.duration)||Math.abs(info.duration-plan.runtimeSeconds)>Math.max(.2,plan.runtimeSeconds*.005)||stats.size===0)throw Error('Audio mix verification failed');
  try{await access(plan.outputPath);throw Error('Output already exists')}catch(e){if(e.code!=='ENOENT')throw e}
  await rename(tmp,plan.outputPath);return {status:'completed',outputPath:plan.outputPath,durationSeconds:info.duration,bytes:stats.size};
 }catch(e){await rm(tmp,{force:true}).catch(()=>{});throw e}
}
