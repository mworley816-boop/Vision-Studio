import test from 'node:test';
import assert from 'node:assert/strict';
import {planAudioProduction,checkAudioBudget,buildAudioMixManifest} from '../lib/audio-production.mjs';
const bible={characters:[{id:'a',name:'Bunny',voiceId:'voice-1'}]};
const storyboard={scenes:[{id:'s1',duration:12,dialogue:{speaker:'Bunny',text:'Hello friend'}},{id:'s2',duration:8}]};
const base={kind:'episode',bible,storyboard};
test('approval required before paid voice synthesis',()=>{
 const p=planAudioProduction({...base,quotes:{'speech:0:s1':{verified:true,maxCents:20}}});
 assert.equal(p.readyForPaidGeneration,false);
 assert.match(p.warnings.join(' '),/awaiting approval/);
});
test('verified quotes and approval enable preparation',()=>{
 const p=planAudioProduction({...base,quotes:{'speech:0:s1':{verified:true,maxCents:20}},approvedCueIds:['speech:0:s1']});
 assert.equal(p.readyForPaidGeneration,true);assert.equal(p.estimatedMaxCents,20);
 assert.equal(checkAudioBudget(p,{spentCents:100,reservedCents:30}).requiredReservationCents,20);
});
test('unverified quote fails closed',()=>assert.equal(planAudioProduction({...base,approvalMode:false,quotes:{'speech:0:s1':{maxCents:20}}}).readyForPaidGeneration,false));
test('music asset and sound effect stay on timeline',()=>{
 const p=planAudioProduction({...base,approvalMode:false,music:{assetId:'track-1',durationSeconds:20},sfx:[{assetId:'bell',startSeconds:3,durationSeconds:2}],quotes:{'speech:0:s1':{verified:true,maxCents:20}}});
 assert.equal(p.jobs.length,3);assert.equal(p.estimatedMaxCents,20);
});
test('out of bounds sfx rejected',()=>assert.throws(()=>planAudioProduction({...base,sfx:[{startSeconds:19,durationSeconds:2}]}),/exceeds timeline/));
test('budget cap rejects overrun',()=>{
 const p=planAudioProduction({...base,approvalMode:false,quotes:{'speech:0:s1':{verified:true,maxCents:300}}});
 assert.throws(()=>checkAudioBudget(p,{spentCents:1900}),/not approved|cap exceeded/);
});
test('missing voice blocks paid generation',()=>{
 const p=planAudioProduction({...base,bible:{},approvalMode:false,quotes:{'speech:0:s1':{verified:true,maxCents:20}}});
 assert.equal(p.readyForPaidGeneration,false);
});
test('audio mix requires verified duration',()=>{
 const p=planAudioProduction({...base,approvalMode:false,quotes:{'speech:0:s1':{verified:true,maxCents:20}}});
 assert.throws(()=>buildAudioMixManifest({plan:p,assets:{}}),/Verified audio/);
 const m=buildAudioMixManifest({plan:p,assets:{'speech:0:s1':{verified:true,assetId:'clip',durationSeconds:1.2}}});
 assert.equal(m.tracks[0].assetId,'clip');
});
