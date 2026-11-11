/** Offline deterministic continuity contracts; no visual recognition or generation. */
const norm = v => typeof v === 'string' ? v.trim() : '';
const stable = x => JSON.stringify(x);
function requireId(value,label){if(!norm(value))throw new Error(`${label} required`);return norm(value);}
export function createContinuityLedger({projectId,productionId,style='',palette=''}) {
 return {projectId:requireId(projectId,'Project ID'),productionId:requireId(productionId,'Production ID'),style:norm(style),palette:norm(palette),characters:{},locations:{},scenes:[],revision:0};
}
export function registerIdentity(ledger,{kind,id,name,appearance='',wardrobe='',voice='',description=''}) {
 if(!['character','location'].includes(kind))throw new Error('Invalid identity kind');
 const key=kind==='character'?'characters':'locations';id=requireId(id,'Identity ID');name=requireId(name,'Identity name');
 if(ledger[key][id])throw new Error('Identity already registered');
 const record=kind==='character'?{id,name,appearance:norm(appearance),wardrobe:norm(wardrobe),voice:norm(voice)}:{id,name,description:norm(description)};
 return {...ledger,[key]:{...ledger[key],[id]:record},revision:ledger.revision+1};
}
export function planContinuityScene(ledger,{sceneId,characterIds=[],locationId,wardrobeOverrides={},styleOverride='',referenceAssetIds=[]}) {
 sceneId=requireId(sceneId,'Scene ID');locationId=requireId(locationId,'Location ID');
 if(ledger.scenes.some(s=>s.sceneId===sceneId))throw new Error('Scene already planned');
 if(!ledger.locations[locationId])throw new Error('Unknown location');
 if(!Array.isArray(characterIds)||new Set(characterIds).size!==characterIds.length)throw new Error('Invalid character IDs');
 for(const id of characterIds)if(!ledger.characters[id])throw new Error('Unknown character');
 for(const id of Object.keys(wardrobeOverrides))if(!characterIds.includes(id))throw new Error('Wardrobe override for absent character');
 if(!Array.isArray(referenceAssetIds)||referenceAssetIds.some(x=>!norm(x))||new Set(referenceAssetIds).size!==referenceAssetIds.length)throw new Error('Invalid reference assets');
 const scene={sceneId,locationId,characterIds:[...characterIds],wardrobeOverrides:Object.fromEntries(Object.entries(wardrobeOverrides).map(([k,v])=>[k,norm(v)])),styleOverride:norm(styleOverride),referenceAssetIds:[...referenceAssetIds],approved:false};
 return {...ledger,scenes:[...ledger.scenes,scene],revision:ledger.revision+1};
}
export function auditContinuity(ledger,{requireReferences=false}={}) {
 const issues=[];
 if(!ledger.style)issues.push({code:'STYLE_MISSING',sceneId:null});
 for(const scene of ledger.scenes){
  if(scene.styleOverride&&scene.styleOverride!==ledger.style)issues.push({code:'STYLE_DRIFT',sceneId:scene.sceneId});
  if(requireReferences&&!scene.referenceAssetIds.length)issues.push({code:'REFERENCE_MISSING',sceneId:scene.sceneId});
  for(const id of scene.characterIds){const character=ledger.characters[id];if(!character){issues.push({code:'CHARACTER_MISSING',sceneId:scene.sceneId});continue;}
   const wardrobe=scene.wardrobeOverrides[id];if(wardrobe&&wardrobe!==character.wardrobe)issues.push({code:'WARDROBE_CHANGE_REVIEW',sceneId:scene.sceneId,characterId:id});
  }
  if(!ledger.locations[scene.locationId])issues.push({code:'LOCATION_MISSING',sceneId:scene.sceneId});
 }
 return {ok:issues.length===0,issues};
}
export function buildContinuityBrief(ledger,sceneId){
 const scene=ledger.scenes.find(s=>s.sceneId===sceneId);if(!scene)throw new Error('Scene not found');
 const audit=auditContinuity(ledger);if(audit.issues.some(i=>i.sceneId===sceneId&&['CHARACTER_MISSING','LOCATION_MISSING'].includes(i.code)))throw new Error('Unresolved references');
 return {projectId:ledger.projectId,productionId:ledger.productionId,sceneId,style:scene.styleOverride||ledger.style,palette:ledger.palette,location:{...ledger.locations[scene.locationId]},characters:scene.characterIds.map(id=>({...ledger.characters[id],wardrobe:scene.wardrobeOverrides[id]||ledger.characters[id].wardrobe})),referenceAssetIds:[...scene.referenceAssetIds],requiresReview:audit.issues.some(i=>i.sceneId===sceneId)};
}
export function approveContinuityScene(ledger,sceneId,{expectedRevision,reviewedIssues=[]}={}){
 if(expectedRevision!==ledger.revision)throw new Error('Stale continuity revision');
 const scene=ledger.scenes.find(s=>s.sceneId===sceneId);if(!scene)throw new Error('Scene not found');
 const issues=auditContinuity(ledger).issues.filter(i=>i.sceneId===sceneId);
 if(issues.some(i=>!reviewedIssues.includes(i.code)))throw new Error('Unreviewed continuity issues');
 return {...ledger,scenes:ledger.scenes.map(s=>s.sceneId===sceneId?{...s,approved:true}:s),revision:ledger.revision+1};
}
export function updateCharacterIdentity(ledger,id,patch){
 if(!ledger.characters[id])throw new Error('Unknown character');
 const allowed=['name','appearance','wardrobe','voice'];if(Object.keys(patch).some(k=>!allowed.includes(k)))throw new Error('Invalid identity field');
 const next={...ledger.characters[id]};for(const [k,v] of Object.entries(patch))next[k]=norm(v);
 if(stable(next)===stable(ledger.characters[id]))return ledger;
 return {...ledger,characters:{...ledger.characters,[id]:next},scenes:ledger.scenes.map(s=>s.characterIds.includes(id)?{...s,approved:false}:s),revision:ledger.revision+1};
}
