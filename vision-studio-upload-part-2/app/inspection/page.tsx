'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {AlertTriangle,CheckCircle2,Image as ImageIcon,ShieldCheck} from 'lucide-react';
import {parseInspectionPreview,summarizeInspections} from '../../lib/inspection-dashboard.mjs';

type Finding={kind:string;outcome:string;notes:string};
type RecordItem={projectId:string;productionId:string;sceneId:string;generatedAssetId:string;generatedImage:string|null;references:{assetId:string;label:string;image:string|null}[];findings:Finding[];reviewStatus:string};
const demo:RecordItem[]=[{projectId:'demo-series',productionId:'Episode 1',sceneId:'scene-01',generatedAssetId:'demo-frame',generatedImage:null,references:[{assetId:'demo-character',label:'Character reference',image:null},{assetId:'demo-room',label:'Location reference',image:null}],findings:[{kind:'character',outcome:'uncertain',notes:'Demonstration: facial details need human verification.'},{kind:'location',outcome:'match',notes:'Demonstration finding only.'}],reviewStatus:'needs_review'}];
export default function InspectionPage(){
 const [records,setRecords]=useState<RecordItem[]>(demo);
 const [raw,setRaw]=useState('');const [error,setError]=useState('');const [demoMode,setDemoMode]=useState(true);
 const [project,setProject]=useState('all');const [selection,setSelection]=useState(0);
 const [decisions,setDecisions]=useState<Record<string,Record<string,'match'|'mismatch'|'uncertain'>>>({});
 const [notes,setNotes]=useState<Record<string,string>>({});
 const projects=useMemo(()=>[...new Set(records.map(r=>r.projectId))],[records]);
 const visible=records.filter(r=>project==='all'||r.projectId===project);
 const current=visible[Math.min(selection,Math.max(0,visible.length-1))];
 const summary=summarizeInspections(visible);
 const key=current?JSON.stringify([current.projectId,current.productionId,current.sceneId]):'';
 const chosen=decisions[key]||{};
 const required=['character','location','style'];
 const complete=!!current&&required.every(k=>chosen[k]==='match')&&Object.values(chosen).every(v=>v==='match');
 return <main className="inspectionShell">
  <div className="monitorTop"><Link href="/production" className="monitorBack">← Production monitor</Link><span>PRIVATE STUDIO · VISUAL INSPECTION</span></div>
  <h1>Visual <em>Review</em></h1>
  <p className="monitorIntro">Compare scene images with approved references and record your review. This is an offline preview, not a live approval system.</p>
  <div className="monitorNotice"><ShieldCheck size={18}/> {demoMode?'Demonstration records only. ':'Imported records are untrusted previews. '}Review decisions stay in this page and do not authorize rendering.</div>
  <div className="inspectionStats"><div><strong>{summary.scenes}</strong><span>Scenes</span></div><div><strong>{summary.flagged}</strong><span>Flagged by inspection</span></div><div><strong>{summary.missingImages}</strong><span>Missing preview images</span></div></div>
  <div className="inspectionLayout"><aside className="inspectionSidebar"><label>Project<select value={project} onChange={e=>{setProject(e.target.value);setSelection(0);}}><option value="all">All projects</option>{projects.map(p=><option key={p} value={p}>{p}</option>)}</select></label><h2>Scenes</h2>{visible.map((r,i)=><button key={`${r.projectId}:${r.productionId}:${r.sceneId}`} className={current===r?'inspectionSelected':''} onClick={()=>setSelection(i)}><span>{r.sceneId}</span><small>{r.productionId} · {r.projectId}</small></button>)}{!visible.length&&<p>No scenes found.</p>}</aside>
  <section className="inspectionWorkspace">{current?<><h2>{current.productionId} · {current.sceneId}</h2><p className="monitorIntro">Generated asset: {current.generatedAssetId}</p><div className="inspectionCompare"><div><h3>Generated scene</h3><div className="inspectionImage">{current.generatedImage?<img src={current.generatedImage} alt="Generated scene preview"/>:<span><ImageIcon/> No embedded image</span>}</div></div><div><h3>Approved reference previews</h3>{current.references.map(ref=><div key={ref.assetId} className="inspectionReference"><p>{ref.label} · {ref.assetId}</p><div className="inspectionImage">{ref.image?<img src={ref.image} alt={ref.label}/>:<span><ImageIcon/> No embedded image</span>}</div></div>)}</div></div><h3>Model findings (advisory only)</h3>{current.findings.length?current.findings.map((f,i)=><p className="inspectionFinding" key={i}><AlertTriangle size={16}/><b>{f.kind}: {f.outcome}</b> — {f.notes}</p>):<p>No model findings supplied.</p>}
  <h3>Human review worksheet</h3><p className="monitorIntro">Record your own decisions. These controls do not update trusted production records.</p><div className="inspectionChecks">{required.map(kind=><label key={kind}>{kind}<select value={chosen[kind]||''} onChange={e=>setDecisions(old=>({...old,[key]:{...old[key],[kind]:e.target.value as 'match'|'mismatch'|'uncertain'}}))}><option value="">Not reviewed</option><option value="match">Match</option><option value="mismatch">Mismatch</option><option value="uncertain">Uncertain</option></select></label>)}</div><label className="inspectionNotes">Reviewer notes<textarea rows={3} value={notes[key]||''} onChange={e=>setNotes(old=>({...old,[key]:e.target.value.slice(0,2000)}))} placeholder="Describe visual differences or corrections"/></label><div className="inspectionResult">{complete?<><CheckCircle2 size={18}/> Worksheet checks match. Server approval still required.</>:<><AlertTriangle size={18}/> Not approved. Complete all checks with matches before requesting approval.</>}</div>
  </>:<p>Select a scene to begin reviewing.</p>}</section></div>
  <details className="monitorImport"><summary>Import inspection preview JSON</summary><p>Up to 100 scenes. Images must be embedded PNG, JPEG, or WebP data URLs; external links are rejected. This preview does not persist approvals or contact providers.</p><textarea rows={5} value={raw} onChange={e=>setRaw(e.target.value)} placeholder='[{"projectId":"...","productionId":"...","sceneId":"...","generatedAssetId":"...","references":[{"assetId":"...","label":"..."}],"findings":[]}]'/><button onClick={()=>{try{setRecords(parseInspectionPreview(raw));setProject('all');setSelection(0);setDecisions({});setNotes({});setDemoMode(false);setError('');}catch(e){setError(e instanceof Error?e.message:'Invalid input');}}}>Load preview</button><button onClick={()=>{setRecords(demo);setDemoMode(true);setProject('all');setSelection(0);setDecisions({});setNotes({});setError('');}}>Restore demo</button>{error&&<p role="alert">{error}</p>}</details>
 </main>;
}
