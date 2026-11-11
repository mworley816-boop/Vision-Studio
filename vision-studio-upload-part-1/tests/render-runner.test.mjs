import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {executeRender,parseFfmpegProgress,probeMedia} from '../lib/render-runner.mjs';
const available=spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status===0&&spawnSync('ffprobe',['-version'],{stdio:'ignore'}).status===0;
test('parses progress timestamp',()=>assert.equal(parseFfmpegProgress('frame= 20 time=00:00:01.25 bitrate=200'),1.25));
test('rejects invalid render plan',async()=>await assert.rejects(executeRender({status:'draft'}),/Invalid render plan/));
test('renders and verifies a real video with audio', {skip:!available,timeout:60000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'vision-studio-'));
 try{
  const input=path.join(dir,'scene.mp4'),audio=path.join(dir,'audio.wav'),output=path.join(dir,'finished.mp4');
  assert.equal(spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=purple:s=160x90:r=10:d=2','-c:v','libx264','-pix_fmt','yuv420p','-y',input]).status,0);
  assert.equal(spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=2','-y',audio]).status,0);
  const plan={status:'ready_to_render',targetDurationSeconds:2,profile:{width:160,height:90},inputs:[{file:input,isImage:false,seconds:2}],audioPath:audio,outputPath:output};
  const result=await executeRender(plan);
  assert.equal(result.status,'completed');assert.ok(result.bytes>1000);assert.ok(result.audio);assert.equal(result.video.width,160);
  assert.ok((await stat(output)).size>1000);
  await assert.rejects(executeRender(plan),/already exists/);
  assert.ok((await probeMedia(output)).duration>=1.9);
 }finally{await rm(dir,{recursive:true,force:true});}
});
