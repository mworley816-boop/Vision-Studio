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
 const [preview,setPreview]=useState(false);
 const [previewing,setPreviewing]=useState(false);
 const [acknowledged,setAcknowledged]=useState(false);
 const [savingReview,setSavingReview]=useState(false);
 const [reviewSaved,setReviewSaved]=useState(false);
 const [reviewHistory,setReviewHistory]=useState<{id:string;created_at:string;maximum_cost_cents:number;project_revision:number;production_revision:number}[]>([]);
 const [historyMessage,setHistoryMessage]=useState('');
 async function check(){
  setLoading(true);setError('');setResult(null);setPrepared(false);setPreview(false);setAcknowledged(false);setReviewSaved(false);setReviewHistory([]);setHistoryMessage('');
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
  setPreparing(true);setError('');setPrepared(false);setPreview(false);setReviewSaved(false);setAcknowledged(false);
  try{
   const response=await fetch('/api/generation-prepare',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,productionId,projectRevision:result.projectRevision,productionRevision:result.productionRevision,requestedMaxCents:result.budgetCapCents})});
   if(!response.ok)throw new Error('Preparation failed. Save any changes and check production readiness again.');
   const data=await response.json();
   if(data.status!=='planning_only'||data.generationEnabled!==false||data.reservationCreated!==false)throw new Error('Unexpected preparation result');
   setPrepared(true);
  }catch(e){setError(e instanceof Error?e.message:'Preparation unavailable');setResult(null)}
  finally{setPreparing(false)}
 }
 async function previewQueue(){
  if(!result?.ready||!prepared||previewing)return;
  setPreviewing(true);setError('');setPreview(false);setReviewSaved(false);setAcknowledged(false);
  try{
   const response=await fetch('/api/generation-queue-preview',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,productionId,projectRevision:result.projectRevision,productionRevision:result.productionRevision,requestedMaxCents:result.budgetCapCents})});
   if(!response.ok)throw new Error('Queue preview unavailable. Check production readiness again.');
   const data=await response.json();
   if(data.status!=='awaiting_explicit_approval'||data.jobCreated!==false||data.providerCalled!==false||data.paymentAuthorized!==false||data.requiresApproval!==true)throw new Error('Unexpected queue preview result');
   setPreview(true);
  }catch(e){setError(e instanceof Error?e.message:'Queue preview unavailable');setPrepared(false)}
  finally{setPreviewing(false)}
 }
 async function loadHistory(){
  setHistoryMessage('');
  try{
   const query=new URLSearchParams({projectId,productionId});
   const response=await fetch('/api/generation-approval-reviews?'+query,{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)throw new Error('Approval history is not configured yet.');
   const data=await response.json();
   if(data.status!=='history'||!Array.isArray(data.records)||data.generationEnabled!==false)throw new Error('Unexpected approval history response');
   setReviewHistory(data.records);
   if(data.records.length===0)setHistoryMessage('No saved approval reviews yet.');
  }catch(e){setHistoryMessage(e instanceof Error?e.message:'Approval history unavailable')}
 }
 async function saveReview(){
  if(!result?.ready||!preview||!acknowledged||savingReview)return;
  setSavingReview(true);setReviewSaved(false);setError('');
  try{
   const response=await fetch('/api/generation-approval-reviews',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,productionId,projectRevision:result.projectRevision,productionRevision:result.productionRevision,requestedMaxCents:result.budgetCapCents,confirmed:true})});
   if(!response.ok)throw new Error('Review was not saved. Approval storage may not be installed, or your production changed.');
   const data=await response.json();
   if(data.status!=='review_saved_only'||data.jobCreated!==false||data.paymentAuthorized!==false)throw new Error('Unexpected approval review response');
   setReviewSaved(true);
   await loadHistory();
  }catch(e){setError(e instanceof Error?e.message:'Review not saved')}
  finally{setSavingReview(false)}
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
   {prepared&&<button type="button" className="smallAction" disabled={previewing||preparing} onClick={previewQueue}>{previewing?'Checking queue proposal…':'Preview generation queue · No charge'}</button>}
   {preview&&<div><p role="status"><strong>Queue preview ready · Awaiting explicit approval</strong> — No job created, no provider contacted, and no payment authorized.</p><label style={{display:'block',marginTop:12}}><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/> I have reviewed the ${(result.budgetCapCents/100).toFixed(2)} maximum budget and understand this is a planning-only review.</label><p className="muted">{acknowledged?'Approval review acknowledged locally · Not submitted':'Approval review requires your confirmation. No job will be created.'}</p><button type="button" className="smallAction" disabled={!acknowledged||savingReview||reviewSaved} onClick={saveReview}>{savingReview?'Saving review…':reviewSaved?'Review saved · No charge':'Save acknowledgment · No charge'}</button><button type="button" className="smallAction" onClick={loadHistory} disabled={savingReview}>View saved review history</button>{reviewSaved&&<p role="status"><strong>Review recorded · Planning only.</strong> No paid job authorized.</p>}{historyMessage&&<p className="muted" role="status">{historyMessage}</p>}{reviewHistory.length>0&&<div><h3>Saved approval reviews</h3><ul>{reviewHistory.map(r=><li key={r.id}>{new Date(r.created_at).toLocaleString()} · Maximum ${(r.maximum_cost_cents/100).toFixed(2)} · Bible {r.project_revision} · Storyboard {r.production_revision} · Review only</li>)}</ul></div>}<p className="muted">This records acknowledgment only. Paid job submission and AI generation remain disabled.</p></div>}
   <p className="muted">AI generation remains disabled. This check does not create jobs, reserve funds, or incur charges.</p>
  </div>}
 </section>;
}
