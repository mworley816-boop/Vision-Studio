/** Local FFmpeg execution. No network calls, no paid generation APIs. */
import {spawn} from 'node:child_process';
import {access, mkdir, rename, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import {ffmpegCommand} from './render-engine.mjs';

function run(binary,args,{signal,onLine}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(binary,args,{stdio:['ignore','pipe','pipe'],signal,windowsHide:true});
  let stderr='',stdout='';
  child.stdout.on('data',chunk=>{stdout+=chunk.toString();if(stdout.length>200000)stdout=stdout.slice(-100000);});
  child.stderr.on('data',chunk=>{stderr+=chunk.toString();if(stderr.length>200000)stderr=stderr.slice(-100000);onLine?.(chunk.toString());});
  child.on('error',reject);
  child.on('close',code=>code===0?resolve({stdout,stderr}):reject(new Error(`${binary} exited ${code}: ${stderr.slice(-2500)}`)));
 });
}
function secondsFromTime(value){const m=/^(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(value);return m?Number(m[1])*3600+Number(m[2])*60+Number(m[3]):null;}
export function parseFfmpegProgress(chunk){const matches=[...chunk.matchAll(/time=(\d+:\d+:\d+(?:\.\d+)?)/g)];return matches.length?secondsFromTime(matches.at(-1)[1]):null;}
export async function probeMedia(file,{ffprobe='ffprobe',signal}={}){
 const {stdout}=await run(ffprobe,['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',file],{signal});
 const parsed=JSON.parse(stdout);
 return {duration:Number(parsed.format?.duration),video:parsed.streams?.find(s=>s.codec_type==='video')??null,audio:parsed.streams?.find(s=>s.codec_type==='audio')??null};
}
/** Executes a validated render plan and atomically promotes the verified result. */
export async function executeRender(plan,{ffmpeg='ffmpeg',ffprobe='ffprobe',signal,onProgress,allowOverwrite=false}={}){
 if(plan?.status!=='ready_to_render'||!Array.isArray(plan.inputs)||!plan.inputs.length)throw new Error('Invalid render plan');
 if(!Number.isFinite(plan.targetDurationSeconds)||plan.targetDurationSeconds<=0)throw new Error('Invalid target duration');
 if(!Number.isInteger(plan.profile?.width)||!Number.isInteger(plan.profile?.height)||plan.profile.width<16||plan.profile.height<16)throw new Error('Invalid video dimensions');
 if(path.extname(plan.outputPath).toLowerCase()!=='.mp4'||!path.isAbsolute(plan.outputPath))throw new Error('Invalid output path');
 const output=path.resolve(plan.outputPath);
 for(const file of [...plan.inputs.map(i=>i.file),...(plan.audioPath?[plan.audioPath]:[])]){
  if(!path.isAbsolute(file))throw new Error('Input path must be absolute');
  await access(file);
  if(path.resolve(file)===output)throw new Error('Output cannot overwrite input');
 }
 if(!allowOverwrite){try{await access(output);throw new Error('Output already exists');}catch(error){if(error.code!=='ENOENT')throw error;}}
 await mkdir(path.dirname(output),{recursive:true});
 const temporary=path.join(path.dirname(output),`.vision-render-${process.pid}-${crypto.randomUUID()}.mp4`);
 const tempPlan={...plan,outputPath:temporary};
 let lastPercent=-1;
 try{
  const {binary,args}=ffmpegCommand(tempPlan);
  await run(ffmpeg==='ffmpeg'?binary:ffmpeg,args,{signal,onLine:chunk=>{
   const current=parseFfmpegProgress(chunk);
   if(current!==null){const percent=Math.min(99,Math.floor(current/plan.targetDurationSeconds*100));if(percent>lastPercent){lastPercent=percent;onProgress?.({percent,seconds:current});}}
  }});
  const details=await probeMedia(temporary,{ffprobe,signal});
  const fileStat=await stat(temporary);
  if(!details.video||fileStat.size===0||!Number.isFinite(details.duration)||Math.abs(details.duration-plan.targetDurationSeconds)>Math.max(1,plan.targetDurationSeconds*.01))throw new Error('Rendered output failed duration or video verification');
  if(details.video.width!==plan.profile.width||details.video.height!==plan.profile.height)throw new Error('Rendered output dimensions mismatch');
  if(plan.audioPath&&!details.audio)throw new Error('Rendered output missing audio');
  if(!allowOverwrite){try{await access(output);throw new Error('Output already exists');}catch(error){if(error.code!=='ENOENT')throw error;}}
  await rename(temporary,output);
  onProgress?.({percent:100,seconds:details.duration});
  return {outputPath:output,bytes:fileStat.size,...details,status:'completed'};
 }catch(error){await rm(temporary,{force:true}).catch(()=>{});throw error;}
}
