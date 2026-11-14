"use client";
import {useState} from 'react';
type Preflight={ready:boolean;issues:string[];projectRevision:number;productionRevision:number;budgetCapCents:number;generationEnabled:boolean};
/** Read-only server verification; does not submit jobs or authorize spending. */
export function GenerationPreflight({projectId,productionId}:{projectId:string;productionId:string}){
 const [result,setResult]=useState<Preflight|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [preparing,setPreparing]=useState(false);
 const [prepared,setPrepared]=useState(false);
 async function check(){
  setLoading(true);setError('');setResult(null);setPrepared(false);
  try{
   const query=new URLSearchParams({projectId,productionId});
   const response=await fetch('/api/generation-preflight?'+query,{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)throw new Error('Unable to verify saved production. Sign in again or retry.');
   const data=await response.json() as Preflight;
   if(typeof data.ready!=='boolean'||!Array.isArray(data.issues)||data.generationEnabled!==false)throw new Error('Unexpected preflight response');
   setResult(data);
  }catch(e){setError(e instanceof Error?e.message:'Preflight unavailable')}
  finally{setLoading(false)}
 }
 async function prepare(){
  if(!result?.ready||preparing)return;
  setPreparing(true);setError('');setPrepared(false);
  try{
   const response=await fetch('/api/generation-prepare',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,productionId,projectRevision:result.projectRevision,productionRevision:result.productionRevision,requestedMaxCents:result.budgetCapCents})});
   if(!response.ok)throw new Error('Preparation failed. Save any changes and check production readiness again.');
   const data=await response.json();
   if(data.status!=='planning_only'||data.generationEnabled!==false||data.reservationCreated!==false)throw new Error('Unexpected preparation result');
   setPrepared(true);
  }catch(e){setError(e instanceof Error?e.message:'Preparation unavailable');setResult(null)}
  finally{setPreparing(false)}
 }
 return <section className="cloud-media" aria-label="Server production readiness" style={{marginTop:16}}>
  <h2>Production readiness · Server check</h2>
  <p className="muted">Verify the saved storyboard and visual references on the server. Save any changes before checking.</p>
  <button type="button" className="smallAction" disabled={loading} onClick={check}>{loading?'Checking saved production…':'Check production readiness'}</button>
  {error&&<p role="alert">{error}</p>}
  {result&&<div role="status" style={{marginTop:12}}>
   <strong>{result.ready?'Ready for future generation setup':'Not ready for generation'}</strong>
   {result.issues.length>0&&<ul>{result.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul>}
   <p className="muted">Saved revisions: Bible {result.projectRevision} · Storyboard {result.productionRevision} · Budget cap ${(result.budgetCapCents/100).toFixed(2)}</p>
   {result.ready&&<button type="button" className="smallAction" disabled={preparing||loading} onClick={prepare}>{preparing?'Preparing safely…':'Prepare generation · No charge'}</button>}
   {prepared&&<p><strong>Preparation verified · Planning only</strong></p>}
   <p className="muted">AI generation remains disabled. This check does not create jobs, reserve funds, or incur charges.</p>
  </div>}
 </section>;
}
