import {normalizeStoryboard,normalizeBible,sceneNeedsContinuityReview} from './visual-editor.mjs';
export function productionReadinessReport(document,bible={},assets=[]){
 const scenes=normalizeStoryboard(document).scenes,b=normalizeBible(bible);
 const imageIds=new Set(assets.filter(asset=>asset.media_type?.startsWith('image/')).map(asset=>asset.id));
 const rows=scenes.map((scene,index)=>{
  const issues=[];
  if(!scene.approved)issues.push('Scene approval required');
  else if(sceneNeedsContinuityReview(scene,b))issues.push('Continuity changed: review and reapprove');
  const ids=Array.isArray(scene.characterIds)?scene.characterIds:[];
  if(!ids.length)issues.push('Assign at least one character or explicitly review character-free scene');
  for(const id of ids){
   const character=b.characters.find(c=>c.id===id);
   if(!character){issues.push('Unknown character assignment');continue;}
   if(!String(character.description||'').trim())issues.push(character.name+': appearance missing');
   if(!String(character.wardrobe||'').trim())issues.push(character.name+': wardrobe missing');
   if(!character.referenceAssetId)issues.push(character.name+': reference image missing');
   else if(!imageIds.has(character.referenceAssetId))issues.push(character.name+': reference image unavailable');
  }
  if(scene.locationId&&!b.locations.some(location=>location.id===scene.locationId))issues.push('Unknown location assignment');
  if(scene.referenceAssetId&&!imageIds.has(scene.referenceAssetId))issues.push('Scene reference image unavailable');
  if(!String(scene.description||'').trim())issues.push('Scene description missing');
  if(!Number.isFinite(Number(scene.duration))||Number(scene.duration)<=0)issues.push('Invalid scene duration');
  return {id:scene.id,number:index+1,ready:issues.length===0,issues};
 });
 return {rows,readyCount:rows.filter(row=>row.ready).length,needsAttention:rows.filter(row=>!row.ready).length,total:rows.length,providerPricingVerified:false,generationAuthorized:false};
}
