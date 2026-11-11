import { LIMITS, EPISODE_ALLOCATION, assertCents, remainingCents } from './budget.mjs';
import { planDialogueTiming } from './voice-timing.mjs';

const ALLOWED = new Set(['dialogue','narration','music','sfx']);
const clean = (v,max=8000) => String(v??'').trim().slice(0,max);
const round = n => Math.round(n*100)/100;

/**
 * Offline audio production plan. NO API requests or billable operations.
 * Quote amounts are maximum integer cents from a trusted server-side quote source.
 */
export function planAudioProduction({kind,storyboard,bible={},music=null,sfx=[],quotes={},approvalMode=true,approvedCueIds=[]}={}){
 if(!(kind in LIMITS)) throw new Error('Unknown production type');
 const timing=planDialogueTiming({storyboard,bible});
 const approved=new Set(approvedCueIds);
 const cues=timing.cues.map((cue,i)=>{
  const id=`speech:${cue.sceneIndex}:${cue.sceneId??i}`;
  const category=cue.speaker==='Narrator'?'narration':'dialogue';
  return {id,category,sceneId:cue.sceneId,startSeconds:cue.startSeconds,durationSeconds:cue.estimatedSeconds,
   speaker:cue.speaker,voiceId:cue.voiceId,text:cue.text,approved:!approvalMode||approved.has(id)};
 });
 if(music){
  const duration=Number(music.durationSeconds);
  if(!Number.isFinite(duration)||duration<=0||duration>timing.runtimeSeconds) throw new Error('Invalid music duration');
  cues.push({id:'music:0',category:'music',startSeconds:0,durationSeconds:duration,assetId:clean(music.assetId,128),approved:!approvalMode||approved.has('music:0')});
 }
 if(!Array.isArray(sfx)||sfx.length>100) throw new Error('Invalid sound effects');
 for(let i=0;i<sfx.length;i++){
  const fx=sfx[i],start=Number(fx.startSeconds),duration=Number(fx.durationSeconds);
  if(!Number.isFinite(start)||start<0||!Number.isFinite(duration)||duration<=0||start+duration>timing.runtimeSeconds+0.001)throw new Error('Sound effect exceeds timeline');
  const id=`sfx:${i}`;
  cues.push({id,category:'sfx',startSeconds:round(start),durationSeconds:round(duration),assetId:clean(fx.assetId,128),approved:!approvalMode||approved.has(id)});
 }
 const warnings=[...timing.warnings];
 const jobs=cues.map(cue=>{
  const quote=quotes[cue.id];
  // No quote = cannot authorize a paid request; existing user-owned audio can be free.
  const usesExistingAsset=Boolean(cue.assetId);
  if(!usesExistingAsset && (!quote || quote.verified!==true || !Number.isSafeInteger(quote.maxCents)||quote.maxCents<0)){
   warnings.push(`${cue.id}: verified provider quote required`);
  }
  if((cue.category==='dialogue'||cue.category==='narration')&&!cue.voiceId)warnings.push(`${cue.id}: missing voice assignment`);
  if(!cue.approved)warnings.push(`${cue.id}: awaiting approval`);
  return {...cue,estimatedMaxCents:usesExistingAsset?0:quote?.verified===true&&Number.isSafeInteger(quote.maxCents)&&quote.maxCents>=0?quote.maxCents:null};
 });
 const quoted=jobs.every(job=>job.estimatedMaxCents!==null);
 const estimatedMaxCents=quoted?jobs.reduce((sum,job)=>sum+job.estimatedMaxCents,0):null;
 const audioAllocationCents=kind==='episode'?EPISODE_ALLOCATION.audio:null;
 if(estimatedMaxCents!==null&&audioAllocationCents!==null&&estimatedMaxCents>audioAllocationCents)
  warnings.push('Audio plan exceeds the $2.40 episode audio allocation; reallocate only with explicit budget approval');
 return {kind,runtimeSeconds:timing.runtimeSeconds,jobs,estimatedMaxCents,audioAllocationCents,warnings,
  readyForPaidGeneration:warnings.length===0&&quoted};
}
/** Server must atomically reserve this amount in a database before calling a provider. */
export function checkAudioBudget(plan,{spentCents=0,reservedCents=0}={}){
 assertCents(spentCents);assertCents(reservedCents);
 if(!plan?.readyForPaidGeneration||plan.estimatedMaxCents===null)throw new Error('Audio plan is not approved and quoted');
 if(plan.estimatedMaxCents>remainingCents(plan.kind,spentCents,reservedCents))throw new Error('Production cap exceeded');
 return {requiredReservationCents:plan.estimatedMaxCents,remainingAfterReservationCents:remainingCents(plan.kind,spentCents,reservedCents)-plan.estimatedMaxCents};
}
/** Reject invalid paths and unverified assets; runner resolves IDs to private paths server-side. */
export function buildAudioMixManifest({plan,assets={}}={}){
 if(!plan?.jobs||!Number.isFinite(plan.runtimeSeconds))throw new Error('Audio plan required');
 return {runtimeSeconds:plan.runtimeSeconds,tracks:plan.jobs.map(job=>{
  const asset=assets[job.id];
  if(!asset||asset.verified!==true||!Number.isFinite(asset.durationSeconds)||asset.durationSeconds<=0)
   throw new Error(`Verified audio asset required for ${job.id}`);
  if(asset.durationSeconds>job.durationSeconds+0.5)throw new Error(`Audio exceeds planned duration for ${job.id}`);
  if(!ALLOWED.has(job.category))throw new Error('Invalid track category');
  return {cueId:job.id,assetId:clean(asset.assetId,128),category:job.category,startSeconds:job.startSeconds,
   durationSeconds:round(asset.durationSeconds),gainDb:job.category==='music'?-12:job.category==='sfx'?-6:0};
 })};
}
