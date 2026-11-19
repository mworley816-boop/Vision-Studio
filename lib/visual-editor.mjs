export function normalizeBible(value={}) {return { ...value, style: typeof value.style==='string'?value.style:'',palette:typeof value.palette==='string'?value.palette:'',characters:Array.isArray(value.characters)?value.characters:[],locations:Array.isArray(value.locations)?value.locations:[] };}
export function normalizeStoryboard(value={}) {return {...value,scenes:Array.isArray(value.scenes)?value.scenes:[]};}
export function addScene(document, scene) {const description=String(scene.description||'').trim(), duration=Number(scene.duration);if(!description||description.length>3000||!Number.isFinite(duration)||duration<=0||duration>420)throw new Error('Scene needs a description and a duration of 1–420 seconds');return {...normalizeStoryboard(document),scenes:[...normalizeStoryboard(document).scenes,{id:crypto.randomUUID(),description,duration,approved:false,characterIds:[],locationId:''}]};}
export function moveScene(document,index,delta){const scenes=[...normalizeStoryboard(document).scenes],target=index+delta;if(!Number.isInteger(index)||![-1,1].includes(delta)||index<0||target<0||target>=scenes.length)return normalizeStoryboard(document);[scenes[index],scenes[target]]=[scenes[target],scenes[index]];return {...document,scenes};}
export function editScene(document,id,changes){return {...normalizeStoryboard(document),scenes:normalizeStoryboard(document).scenes.map(s=>s.id===id?{...s,...changes,approved:false}:s)};}
export function sceneReferenceSnapshot(scene,bible={}) {
 const b=normalizeBible(bible);
 const characterIds=[...new Set(Array.isArray(scene.characterIds)?scene.characterIds:[])].sort();
 return {characters:characterIds.map(id=>({id,referenceAssetId:b.characters.find(c=>c.id===id)?.referenceAssetId||'',description:b.characters.find(c=>c.id===id)?.description||'',wardrobe:b.characters.find(c=>c.id===id)?.wardrobe||''})),locationId:scene.locationId||'',locationReferenceAssetId:b.locations.find(l=>l.id===scene.locationId)?.referenceAssetId||'',sceneReferenceAssetId:scene.referenceAssetId||''};
}
export function sceneNeedsContinuityReview(scene,bible={}) {
 if(!scene.approved)return false;
 if(!scene.referenceSnapshot)return false; // Legacy approvals have no comparison baseline.
 const saved=scene.referenceSnapshot;
 const current=sceneReferenceSnapshot(scene,bible);
 if(saved.locationId!==current.locationId||saved.locationReferenceAssetId!==current.locationReferenceAssetId||saved.sceneReferenceAssetId!==current.sceneReferenceAssetId)return true;
 if(!Array.isArray(saved.characters)||saved.characters.length!==current.characters.length)return true;
 const savedById=new Map(saved.characters.map(character=>[character.id,character.referenceAssetId||'']));
 if(savedById.size!==current.characters.length)return true;
 return current.characters.some(character=>{const prior=saved.characters.find(item=>item.id===character.id);return !prior||prior.referenceAssetId!==character.referenceAssetId||('description' in prior&&prior.description!==character.description)||('wardrobe' in prior&&prior.wardrobe!==character.wardrobe);});
}
export function approveScene(document,id,bible) {return {...normalizeStoryboard(document),scenes:normalizeStoryboard(document).scenes.map(s=>s.id===id?{...s,approved:true,...(bible?{referenceSnapshot:sceneReferenceSnapshot(s,bible)}:{})}:s)};}

export function deleteScene(document,id){return {...normalizeStoryboard(document),scenes:normalizeStoryboard(document).scenes.filter(s=>s.id!==id)};}
export function addVisualRecord(bible,kind,record){if(!['characters','locations'].includes(kind))throw new Error('Invalid record type');const b=normalizeBible(bible),name=String(record.name||'').trim(),description=String(record.description||'').trim();if(!name||!description)throw new Error('Name and description are required');if(b[kind].some(x=>x.name.toLowerCase()===name.toLowerCase()))throw new Error('Duplicate name');return {...b,[kind]:[...b[kind],{...record,id:crypto.randomUUID(),name,description}]};}
export function deleteVisualRecord(bible,kind,id){if(!['characters','locations'].includes(kind))throw new Error('Invalid record type');const b=normalizeBible(bible);return {...b,[kind]:b[kind].filter(x=>x.id!==id)};}

/** Cloud storyboard planning gate; no provider execution is authorized here. */
export function cloudStoryboardReadiness(document,bible={}) {
 const scenes=normalizeStoryboard(document).scenes;
 const issues=[];
 if(!scenes.length)issues.push('Add at least one scene.');
 for(const [index,scene] of scenes.entries()) {
  if(!scene.approved)issues.push(`Scene ${index+1} needs approval.`);
  else if(sceneNeedsContinuityReview(scene,bible))issues.push(`Scene ${index+1} needs continuity review and reapproval.`);
 }
 return {ready:issues.length===0,issues};
}
