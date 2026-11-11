/** Offline FFmpeg render planning. Never executes a process or incurs API charges. */
import path from 'node:path';

const PROFILES={landscape:{width:1920,height:1080},portrait:{width:1080,height:1920}};
const allowedExt=new Set(['.mp4','.mov','.mkv','.webm','.png','.jpg','.jpeg','.webp','.mp3','.wav','.m4a','.aac','.flac','.ogg']);
function safeMedia(file){
 if(typeof file!=='string'||!path.isAbsolute(file)||!allowedExt.has(path.extname(file).toLowerCase())||file.includes('\0')||file.includes('\n'))throw new Error('Absolute supported media path required');
 return file;
}
function duration(value){if(!Number.isFinite(value)||value<=0||value>420)throw new Error('Invalid scene duration');return value;}
/** Explicit scene durations must total the selected format's target duration. */
export function prepareRender(manifest,{sceneAssets,audioPath,outputPath,orientation='landscape',sceneDurations}={}){
 if(!manifest||manifest.status!=='awaiting_renderer'||!['music','episode'].includes(manifest.kind))throw new Error('Invalid render manifest');
 const profile=PROFILES[orientation];if(!profile)throw new Error('Unsupported orientation');
 if(!Array.isArray(manifest.scenes)||!manifest.scenes.length)throw new Error('No scenes to render');
 if(!Array.isArray(sceneDurations)||sceneDurations.length!==manifest.scenes.length)throw new Error('One duration per scene required');
 const target=manifest.kind==='music'?180:420;
 const durations=sceneDurations.map(duration);
 if(Math.abs(durations.reduce((a,b)=>a+b,0)-target)>.02)throw new Error('Scene durations must total target runtime');
 if(!sceneAssets||typeof sceneAssets!=='object')throw new Error('Scene assets required');
 const inputs=manifest.scenes.map((scene,index)=>{
  const asset=sceneAssets[scene.sceneId];
  if(!asset||!scene.assetIds?.includes(asset.assetId))throw new Error('Scene asset does not match approved manifest');
  const file=safeMedia(asset.path);const isImage=['.png','.jpg','.jpeg','.webp'].includes(path.extname(file).toLowerCase());
  return {sceneId:scene.sceneId,file,assetId:asset.assetId,isImage,seconds:durations[index]};
 });
 const output=safeMedia(outputPath);
 if(path.extname(output).toLowerCase()!=='.mp4')throw new Error('Output must be MP4');
 const audio=audioPath?safeMedia(audioPath):null;
 if(audio&& !['.mp3','.wav','.m4a','.aac','.flac','.ogg','.mp4'].includes(path.extname(audio).toLowerCase()))throw new Error('Unsupported audio file');
 return {productionId:manifest.productionId,projectId:manifest.projectId,orientation,profile,targetDurationSeconds:target,inputs,audioPath:audio,outputPath:output,requiresLocalFiles:true,status:'ready_to_render'};
}
/** Generates FFmpeg argument arrays, not shell commands. Caller validates files and runs via spawn. */
export function ffmpegCommand(render){
 if(render?.status!=='ready_to_render'||!render.inputs?.length)throw new Error('Invalid render plan');
 const args=['-hide_banner','-y'];
 for(const input of render.inputs){
  if(input.isImage)args.push('-loop','1','-framerate','30');
  args.push('-i',input.file);
 }
 if(render.audioPath)args.push('-i',render.audioPath);
 const {width,height}=render.profile;
 const filters=render.inputs.map((input,i)=>`[${i}:v]trim=duration=${input.seconds},setpts=PTS-STARTPTS,fps=30,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p[v${i}]`);
 filters.push(`${render.inputs.map((_,i)=>`[v${i}]`).join('')}concat=n=${render.inputs.length}:v=1:a=0[vout]`);
 args.push('-filter_complex',filters.join(';'),'-map','[vout]');
 if(render.audioPath)args.push('-map',`${render.inputs.length}:a:0`,'-c:a','aac','-b:a','192k');
 else args.push('-an');
 args.push('-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-r','30','-t',String(render.targetDurationSeconds),'-movflags','+faststart',render.outputPath);
 return {binary:'ffmpeg',args};
}
