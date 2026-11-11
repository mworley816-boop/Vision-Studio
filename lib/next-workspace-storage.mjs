/** Canonical single-key Next.js workspace storage. Legacy split keys are read-only migration sources. */
export const NEXT_WORKSPACE_KEYS = Object.freeze({projects:'vision-studio-projects-v1',productions:'vision-studio-productions-v1',bibles:'vision-studio-bibles-v1'});
export const NEXT_ATOMIC_KEY='vision-studio-next-workspace-v2';
function validate(data){
  if(!data||typeof data!=='object'||!Array.isArray(data.projects)||!Array.isArray(data.productions)||!Array.isArray(data.bibles))throw Error('Saved workspace has an invalid format. Editing is blocked.');
  const projectIds=new Set();
  for(const p of data.projects){if(!p||typeof p.id!=='string'||!p.id||projectIds.has(p.id)||!['music','episode'].includes(p.kind)||!['automatic','approval'].includes(p.mode))throw Error('Saved project records are invalid. Editing is blocked.');projectIds.add(p.id);}
  const productionIds=new Set();
  for(const p of data.productions){const project=data.projects.find(x=>x.id===p?.projectId);if(!p||typeof p.id!=='string'||!p.id||productionIds.has(p.id)||!project||!Array.isArray(p.scenes)||p.kind!==project.kind||!Number.isSafeInteger(p.spentCents??0)||!Number.isSafeInteger(p.reservedCents??0)||(p.spentCents??0)<0||(p.reservedCents??0)<0||(p.spentCents??0)+(p.reservedCents??0)>(p.kind==='music'?500:2000))throw Error('Saved production records are invalid. Editing is blocked.');const scenes=new Set();for(const s of p.scenes){if(!s||typeof s.id!=='string'||!s.id||scenes.has(s.id)||typeof s.description!=='string'||typeof s.approved!=='boolean')throw Error('Saved scene records are invalid. Editing is blocked.');scenes.add(s.id);}productionIds.add(p.id);}
  const bibleIds=new Set();
  for(const b of data.bibles){if(!b||typeof b.projectId!=='string'||!projectIds.has(b.projectId)||bibleIds.has(b.projectId)||!Array.isArray(b.characters)||!Array.isArray(b.locations))throw Error('Saved Visual Bible records are invalid. Editing is blocked.');bibleIds.add(b.projectId);}
  // A reference must resolve within the Visual Bible belonging to its own project.
  // Legacy drafts without assigned references remain importable.
  const bibleByProject=new Map(data.bibles.map(b=>[b.projectId,b]));
  for(const b of data.bibles){
    for(const field of ['characters','locations']){
      const ids=new Set();
      for(const item of b[field]){
        if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id)||typeof item.name!=='string'||!item.name.trim())
          throw Error('Saved Visual Bible references are invalid. Editing is blocked.');
        ids.add(item.id);
      }
    }
  }
  for(const p of data.productions){
    const bible=bibleByProject.get(p.projectId);
    for(const scene of p.scenes){
      if(scene.characterIds!==undefined){
        if(!Array.isArray(scene.characterIds)||new Set(scene.characterIds).size!==scene.characterIds.length||scene.characterIds.some(id=>typeof id!=='string'||!id||!bible?.characters.some(c=>c.id===id)))
          throw Error('Saved scene character references are invalid. Editing is blocked.');
      }
      if(scene.locationId!==undefined&&scene.locationId!==''){
        if(typeof scene.locationId!=='string'||!bible?.locations.some(l=>l.id===scene.locationId))
          throw Error('Saved scene location references are invalid. Editing is blocked.');
      }
    }
  }
  return data;
}
export function hasNextWorkspace(storage){return storage.getItem(NEXT_ATOMIC_KEY)!==null||Object.values(NEXT_WORKSPACE_KEYS).some(k=>storage.getItem(k)!==null);}
export function loadNextWorkspace(storage){
  const atomic=storage.getItem(NEXT_ATOMIC_KEY);
  if(atomic!==null){let parsed;try{parsed=JSON.parse(atomic);}catch{throw Error('Saved workspace is damaged. Editing is blocked.');}if(parsed?.version!==2)throw Error('Unsupported workspace storage version. Editing is blocked.');return validate(parsed.data);}
  const data={};for(const [field,key] of Object.entries(NEXT_WORKSPACE_KEYS)){const raw=storage.getItem(key);if(raw===null){data[field]=[];continue;}try{data[field]=JSON.parse(raw);}catch{throw Error(`Saved ${field} data is damaged. Editing is blocked.`);}}
  return validate(data);
}
export function saveNextWorkspace(storage,data){
  validate(data);
  // One browser-storage write: either the new complete snapshot is stored or the old one remains.
  storage.setItem(NEXT_ATOMIC_KEY,JSON.stringify({version:2,data}));
}
