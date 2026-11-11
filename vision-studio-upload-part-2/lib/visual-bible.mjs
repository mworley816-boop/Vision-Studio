/** Local-first visual identity records. No generation provider is connected. */
export function createVisualBible(projectId) {
 if (!projectId) throw new Error('Project ID required');
 return {projectId,style:'',palette:'',characters:[],locations:[],updatedAt:new Date().toISOString()};
}
function clean(value){return typeof value==='string'?value.trim():'';}
export function addCharacter(bible,character){
 const name=clean(character?.name),description=clean(character?.description);
 if(!name||!description)throw new Error('Character name and description required');
 if(bible.characters.some(c=>c.name.toLowerCase()===name.toLowerCase()))throw new Error('Character already exists');
 return {...bible,characters:[...bible.characters,{id:character.id||crypto.randomUUID(),name,description,wardrobe:clean(character.wardrobe),voice:clean(character.voice)}],updatedAt:new Date().toISOString()};
}
export function addLocation(bible,location){
 const name=clean(location?.name),description=clean(location?.description);
 if(!name||!description)throw new Error('Location name and description required');
 if(bible.locations.some(l=>l.name.toLowerCase()===name.toLowerCase()))throw new Error('Location already exists');
 return {...bible,locations:[...bible.locations,{id:location.id||crypto.randomUUID(),name,description}],updatedAt:new Date().toISOString()};
}
export function updateStyle(bible,style,palette){return {...bible,style:clean(style),palette:clean(palette),updatedAt:new Date().toISOString()};}
export function assignSceneReferences(production,sceneId,characterIds=[],locationId=''){
 if(!production.scenes.some(s=>s.id===sceneId))throw new Error('Scene not found');
 return {...production,scenes:production.scenes.map(s=>s.id===sceneId?{...s,characterIds:[...new Set(characterIds)],locationId,approved:false}:s)};
}
export function inspectContinuity(production,bible){
 const issues=[];
 if(production.projectId!==bible.projectId)issues.push({sceneId:null,code:'PROJECT_MISMATCH',message:'Visual Bible belongs to another project'});
 if(!bible.style)issues.push({sceneId:null,code:'STYLE_MISSING',message:'Project visual style is not defined'});
 for(const scene of production.scenes){
  for(const id of scene.characterIds||[]){if(!bible.characters.some(c=>c.id===id))issues.push({sceneId:scene.id,code:'CHARACTER_MISSING',message:`Scene references an unknown character (${id})`});}
  if(scene.locationId&&!bible.locations.some(l=>l.id===scene.locationId))issues.push({sceneId:scene.id,code:'LOCATION_MISSING',message:'Scene references an unknown location'});
  if(!scene.locationId)issues.push({sceneId:scene.id,code:'LOCATION_UNASSIGNED',message:'Scene has no assigned location'});
 }
 return {ok:issues.length===0,issues};
}
export function buildShotBrief(production,scene,bible){
 if(production.projectId!==bible.projectId)throw new Error('Project mismatch');
 const characterIds=scene.characterIds||[];
 const characters=characterIds.map(id=>bible.characters.find(c=>c.id===id));
 if(characters.some(c=>!c))throw new Error('Unresolved character reference');
 const location=bible.locations.find(l=>l.id===scene.locationId);
 if(!location)throw new Error('Unresolved location reference');
 return {projectId:bible.projectId,productionId:production.id,sceneId:scene.id,description:scene.description,style:bible.style,palette:bible.palette,characters:characters.map(c=>({name:c.name,appearance:c.description,wardrobe:c.wardrobe,voice:c.voice})),location:{name:location.name,description:location.description}};
}
