import {normalizeStoryboard,normalizeBible} from './visual-editor.mjs';
const clean=value=>String(value||'').trim();
export function sceneContinuityBrief(document,sceneId,bible={}){
 const scenes=normalizeStoryboard(document).scenes;
 const index=scenes.findIndex(scene=>scene.id===sceneId);
 if(index<0)throw new Error('Scene not found');
 const scene=scenes[index],b=normalizeBible(bible);
 const characters=(Array.isArray(scene.characterIds)?scene.characterIds:[]).map(id=>b.characters.find(c=>c.id===id));
 const location=b.locations.find(l=>l.id===scene.locationId);
 const lines=['SCENE '+(index+1)+' · '+Number(scene.duration||0)+' seconds','Action: '+clean(scene.description)];
 for(const character of characters){
  if(!character){lines.push('Character: Unknown assignment — review required');continue;}
  lines.push('Character: '+clean(character.name));
  lines.push('Appearance and hairstyle: '+(clean(character.description)||'Not specified — review required'));
  lines.push('Wardrobe: '+(clean(character.wardrobe)||'Not specified — review required'));
  lines.push('Character reference image ID: '+(clean(character.referenceAssetId)||'Not assigned'));
 }
 lines.push('Location: '+(location?clean(location.name):scene.locationId?'Unknown assignment — review required':'Not assigned'));
 if(location)lines.push('Location details: '+clean(location.description));
 lines.push('Scene reference image ID: '+(clean(scene.referenceAssetId)||'Not assigned'));
 lines.push('Planning reference only. Verify image identity and rights. No generation or spending authorized.');
 return lines.join('\n');
}
