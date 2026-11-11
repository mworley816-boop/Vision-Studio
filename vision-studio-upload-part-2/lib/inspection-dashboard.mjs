/** Read-only, untrusted JSON preview for offline visual inspection review. */
const checks=new Set(['character','wardrobe','location','style','reference']);
const outcomes=new Set(['match','mismatch','uncertain']);
const str=(v,max=200)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export function safePreviewImage(value){
 if(typeof value!=='string'||value.length>750000)return null;
 // Embedded PNG/JPEG/WebP only. Never accept arbitrary URLs, SVG or HTML.
 return /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)?value:null;
}
export function parseInspectionPreview(json){
 if(typeof json!=='string'||json.length>3000000)throw Error('Preview exceeds size limit');
 const raw=JSON.parse(json);
 if(!Array.isArray(raw)||raw.length>100)throw Error('Expected up to 100 inspection records');
 const ids=new Set();
 return raw.map((r)=>{
  if(!r||typeof r!=='object'||!str(r.projectId)||!str(r.productionId)||!str(r.sceneId)||!str(r.generatedAssetId)||!Array.isArray(r.references)||r.references.length<1||r.references.length>12||!Array.isArray(r.findings)||r.findings.length>40)throw Error('Invalid inspection record');
  const key=JSON.stringify([r.projectId,r.productionId,r.sceneId]);
  if(ids.has(key))throw Error('Duplicate scene inspection');ids.add(key);
  const references=r.references.map(a=>{
   if(!a||!str(a.assetId)||!str(a.label,120))throw Error('Invalid reference');
   return {assetId:a.assetId,label:a.label,image:safePreviewImage(a.image)};
  });
  if(new Set(references.map(a=>a.assetId)).size!==references.length)throw Error('Duplicate reference');
  const findings=r.findings.map(f=>{
   if(!f||!checks.has(f.kind)||!outcomes.has(f.outcome)||typeof f.notes!=='string'||f.notes.length>1000)throw Error('Invalid finding');
   return {kind:f.kind,outcome:f.outcome,notes:f.notes};
  });
  return {projectId:r.projectId,productionId:r.productionId,sceneId:r.sceneId,generatedAssetId:r.generatedAssetId,generatedImage:safePreviewImage(r.generatedImage),references,findings,reviewStatus:'needs_review'};
 });
}
export function summarizeInspections(records){
 return {scenes:records.length,flagged:records.filter(r=>r.findings.some(f=>f.outcome!=='match')).length,missingImages:records.filter(r=>!r.generatedImage||r.references.some(a=>!a.image)).length};
}
