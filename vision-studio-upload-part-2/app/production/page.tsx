'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Clapperboard,Music2,ShieldCheck,AlertTriangle,CheckCircle2,Clock3} from 'lucide-react';

type Job={id:string;projectId:string;productionId:string;kind:'music'|'episode';mode:'automatic'|'approval';status:string;version:number;spentCents:number;reservedCents:number;exportAssetId:string|null};
const sample:Job[]=[
 {id:'demo-1',projectId:'demo-music',productionId:'Midnight Glow',kind:'music',mode:'approval',status:'awaiting_storyboard_approval',version:1,spentCents:0,reservedCents:0,exportAssetId:null},
 {id:'demo-2',projectId:'demo-series',productionId:'Ballet Day — Episode 1',kind:'episode',mode:'automatic',status:'preparing',version:2,spentCents:120,reservedCents:200,exportAssetId:null},
 {id:'demo-3',projectId:'demo-series',productionId:'Ballet Day — Episode 0',kind:'episode',mode:'approval',status:'failed',version:3,spentCents:150,reservedCents:0,exportAssetId:null},
];
const next:Record<string,string>={draft:'Submit storyboard',awaiting_storyboard_approval:'Approve storyboard',preparing:'Prepare scene and audio assets',awaiting_asset_approval:'Approve generated assets',ready_to_render:'Start rendering',rendering:'Verify final export',awaiting_export_approval:'Approve final export',complete:'Download verified export',failed:'Review failure and retry',cancelled:'No further actions'};
const allowed=new Set(Object.keys(next));
function parseJobs(text:string):Job[]{
 const value:unknown=JSON.parse(text);
 if(!Array.isArray(value)||value.length>500)throw Error('Expected an array of up to 500 workflows');
 return value.map((v:unknown)=>{
  if(!v||typeof v!=='object')throw Error('Invalid workflow');
  const w=v as Record<string,unknown>;
  if(!['music','episode'].includes(String(w.kind))||!allowed.has(String(w.status))||typeof w.projectId!=='string'||typeof w.productionId!=='string'||typeof w.id!=='string')throw Error('Invalid workflow fields');
  for(const key of ['spentCents','reservedCents'])if(!Number.isSafeInteger(w[key])||(w[key] as number)<0)throw Error('Invalid cost amounts');
  if((w.spentCents as number)+(w.reservedCents as number)>(w.kind==='music'?500:2000))throw Error('Budget exceeds cap');
  return {id:w.id,projectId:w.projectId,productionId:w.productionId,kind:w.kind,mode:w.mode==='automatic'?'automatic':'approval',status:w.status,version:Number(w.version)||0,spentCents:w.spentCents,reservedCents:w.reservedCents,exportAssetId:typeof w.exportAssetId==='string'?w.exportAssetId:null} as Job;
 });
}
export default function ProductionPage(){
 const [jobs,setJobs]=useState<Job[]>([]);const [demo,setDemo]=useState(false);const [source,setSource]=useState('not-loaded');const [loading,setLoading]=useState(false);const [project,setProject]=useState('all');const [status,setStatus]=useState('all');const [raw,setRaw]=useState('');const [error,setError]=useState('');
 const projects=useMemo(()=>[...new Set(jobs.map(j=>j.projectId))], [jobs]);
 const rows=useMemo(()=>jobs.filter(j=>(project==='all'||j.projectId===project)&&(status==='all'||j.status===status)),[jobs,project,status]);
 const pending=rows.filter(j=>j.status.startsWith('awaiting_')).length;
 const failed=rows.filter(j=>j.status==='failed').length;
 const complete=rows.filter(j=>j.status==='complete').length;
 return <main className="monitorShell">
 <div className="monitorTop"><Link href="/" className="monitorBack">← Studio home</Link><span>PRIVATE WORKSPACE · PRODUCTION MONITOR</span></div>
 <h1>Production <em>Overview</em></h1><p className="monitorIntro">Track separate music videos and animated episodes, approvals, and spending.</p>
 {source==='not-loaded'&&<div className="monitorNotice">No production records loaded. Select Refresh trusted feed to check the authenticated cloud workspace, or restore demonstration records.</div>}
 <div className="monitorFilters"><button disabled={loading} onClick={async()=>{setLoading(true);setError('');try{const response=await fetch('/api/production-feed',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Feed unavailable');if(data.source!=='trusted-server'||!Array.isArray(data.rows))throw Error('Untrusted response');setJobs(parseJobs(JSON.stringify(data.rows)));setDemo(false);setSource('trusted');setProject('all');setStatus('all');}catch(e){setError(e instanceof Error?e.message:'Feed unavailable');setJobs([]);setDemo(false);setSource('unavailable');}finally{setLoading(false)}}}>{loading?'Loading…':'Refresh trusted feed'}</button>{source==='trusted'&&<span>Authenticated read-only feed</span>}</div>
 {error&&<p role="alert">{error}</p>}
 {demo&&<div className="monitorNotice"><ShieldCheck size={18}/> Demonstration records only. No real AI jobs are running or being charged.</div>}
 <div className="monitorStats"><article><Clock3/><small>VISIBLE PRODUCTIONS</small><strong>{rows.length}</strong></article><article><ShieldCheck/><small>AWAITING APPROVAL</small><strong>{pending}</strong></article><article><AlertTriangle/><small>NEEDS ATTENTION</small><strong>{failed}</strong></article><article><CheckCircle2/><small>COMPLETED</small><strong>{complete}</strong></article></div>
 <div className="monitorFilters"><label>Project<select value={project} onChange={e=>setProject(e.target.value)}><option value="all">All projects</option>{projects.map(p=><option key={p} value={p}>{p}</option>)}</select></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{[...allowed].map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label></div>
 <div className="monitorList">{rows.length===0?<p>No productions match these filters.</p>:rows.map(j=>{const cap=j.kind==='music'?500:2000;const used=j.spentCents+j.reservedCents;return <article className="monitorCard" key={j.id}><div className="monitorCardHead"><span className="monitorIcon">{j.kind==='music'?<Music2/>:<Clapperboard/>}</span><div><h2>{j.productionId}</h2><small>{j.projectId} · {j.kind==='music'?'Music video':'7-minute episode'} · {j.mode}</small></div><span className="monitorStatus">{j.status.replaceAll('_',' ')}</span></div><p><b>Next:</b> {next[j.status]}</p><div className="monitorBudget"><span>Spent ${(j.spentCents/100).toFixed(2)} · Reserved ${(j.reservedCents/100).toFixed(2)}</span><span>${(used/100).toFixed(2)} / ${(cap/100).toFixed(2)}</span></div><div className="monitorMeter"><div style={{width:`${used/cap*100}%`}}/></div>{j.status==='complete'&&<p>Export reference: {j.exportAssetId??'Not available'}</p>}</article>})}</div>
 <details className="monitorImport"><summary>Load local workflow records (JSON)</summary><p>Paste an array of workflow objects exported from your local production system. This replaces the demonstration data in this view only; it does not change your projects or run any jobs.</p><textarea value={raw} onChange={e=>setRaw(e.target.value)} rows={6} placeholder='[{"id":"...","projectId":"...",...}]'/><button onClick={()=>{try{setJobs(parseJobs(raw));setDemo(false);setSource('local-import');setProject('all');setStatus('all');setError('');}catch(e){setError(e instanceof Error?e.message:'Invalid JSON');}}}>Load records</button>{error&&<p role="alert">{error}</p>}<button onClick={()=>{setJobs(sample);setDemo(true);setSource('demo');setProject('all');setStatus('all');setError('');}}>Restore demo</button></details>
 <p className="monitorFoot">Read-only monitoring. Trusted feed requires authenticated cloud setup; imported and demonstration records are local only. Workflow transitions, approvals, cloud synchronization and downloads must be connected to authenticated server actions before live use.</p>
 </main>;
}
