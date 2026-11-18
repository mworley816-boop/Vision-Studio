import {normalizeStoryboard,editScene,normalizeBible} from './visual-editor.mjs';
export function auditStoryboardContinuity(document,bible={},assets=[]){
 const scenes=normalizeStoryboard(document).scenes,b=normalizeBible(bible);
 const imageIds=new Set(assets.filter(a=>a.media_type?.startsWith('image/')).map(a=>a.id));
 const rows=scenes.map((scene,index)=>{
  const assigned=(scene.characterIds||[]).map(id=>b.characters.find(c=>c.id===id));
  const location=b.locations.find(l=>l.id===scene.locationId);
  const issues=[];
  if(!assigned.length)issues.push('No characters assigned');
  for(const character of assigned){if(!character)issues.push('Unknown character');else if(!character.referenceAssetId)issues.push(character.name+' has no reference image');else if(!imageIds.has(character.referenceAssetId))issues.push(character.name+' reference image unavailable');}
  if(scene.locationId&&!location)issues.push('Unknown location');
  if(scene.referenceAssetId&&!imageIds.has(scene.referenceAssetId))issues.push('Scene image unavailable');
  return {number:index+1,id:scene.id,characters:assigned.filter(Boolean).map(c=>c.name),location:location?.name||'',issues};
 });
 return {rows,scenesWithIssues:rows.filter(row=>row.issues.length).length};
}
export function assignCharacterToScenes(document,characterId,{onlyUnassigned=true}={}){
 if(!characterId)throw new Error('Choose a character');
 let updated=normalizeStoryboard(document);
 for(const scene of updated.scenes){
  const ids=Array.isArray(scene.characterIds)?scene.characterIds:[];
  if(onlyUnassigned&&ids.length)continue;
  if(ids.includes(characterId))continue;
  updated=editScene(updated,scene.id,{characterIds:[...ids,characterId]});
 }
 return updated;
}
