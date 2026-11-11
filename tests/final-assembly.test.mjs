import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {prepareFinalAssembly,executeFinalAssembly} from '../lib/final-assembly.mjs';
const base=(root,duration=2)=>({
 renderPlan:{status:'ready_to_render',targetDurationSeconds:duration,profile:{width:160,height:90},outputPath:path.join(root,'final.mp4'),inputs:[{file:path.join(root,'scene.mp4'),seconds:duration,isImage:false}]},
 audioMixPlan:{runtimeSeconds:duration,outputPath:path.join(root,'mixed.wav'),tracks:[{file:path.join(root,'voice.wav'),startSeconds:0,durationSeconds:1,gainDb:0}]}
});
test('reject mismatched durations',()=>{const p=base('/tmp');p.audioMixPlan.runtimeSeconds=3;assert.throws(()=>prepareFinalAssembly(p),/runtimes/)});
test('reject unrelated video soundtrack path',()=>{const p=base('/tmp');p.renderPlan.audioPath='/tmp/other.wav';assert.throws(()=>prepareFinalAssembly(p),/audio path/)});
test('reject identical output paths',()=>{const p=base('/tmp');p.audioMixPlan.outputPath=p.renderPlan.outputPath;assert.throws(()=>prepareFinalAssembly(p),/must differ/)});
test('produce verified MP4 with mixed audio',async t=>{
 if(spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status!==0||spawnSync('ffprobe',['-version'],{stdio:'ignore'}).status!==0){t.skip('ffmpeg/ffprobe not installed');return}
 const dir=await mkdtemp(path.join(os.tmpdir(),'vision-final-'));
 try{
  const p=base(dir);
  const v=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=black:s=160x90:r=30:d=2','-c:v','libx264','-pix_fmt','yuv420p','-y',p.renderPlan.inputs[0].file],{encoding:'utf8'});
  assert.equal(v.status,0,v.stderr);
  const a=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=440:duration=1','-y',p.audioMixPlan.tracks[0].file],{encoding:'utf8'});
  assert.equal(a.status,0,a.stderr);
  const stages=[];const result=await executeFinalAssembly(prepareFinalAssembly(p),{onProgress:e=>stages.push(e.stage)});
  assert.equal(result.status,'completed');assert.ok(result.bytes>0);assert.ok(result.audio);assert.ok(result.video);assert.ok(stages.includes('complete'));
 }finally{await rm(dir,{recursive:true,force:true})}
});
