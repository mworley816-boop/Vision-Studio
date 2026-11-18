import {normalizeStoryboard,normalizeBible} from './visual-editor.mjs';
/** Metadata-only coverage. Does not compare image pixels or certify visual similarity. */
export function visualIdentityCoverage(document,bible={},assets=[]){
 const scenes=normalizeStoryboard(document).scenes;
 const characters=normalizeBible(bible).characters;
 const images=new Set(assets.filter(asset=>asset.media_type?.startsWith('image/')).map(asset=>asset.id));
 const rows=characters.map(character=>{
  const sceneNumbers=scenes.flatMap((scene,index)=>(scene.characterIds||[]).includes(character.id)?[index+1]:[]);
  const missing=[];
  if(!String(character.description||'').trim())missing.push('Appearance description');
  if(!String(character.wardrobe||'').trim())missing.push('Wardrobe description');
  if(!character.referenceAssetId)missing.push('Reference image');
  else if(!images.has(character.referenceAssetId))missing.push('Available reference image');
  return {id:character.id,name:character.name,sceneNumbers,missing,complete:missing.length===0};
 });
 const unknownAssignments=scenes.flatMap((scene,index)=>(scene.characterIds||[]).filter(id=>!characters.some(character=>character.id===id)).map(id=>({scene:index+1,characterId:id})));
 return {rows,unknownAssignments,usedCharacters:rows.filter(row=>row.sceneNumbers.length).length,usedCharactersNeedingReview:rows.filter(row=>row.sceneNumbers.length&&row.missing.length).length};
}
