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
 const [reviewHistory,setReviewHistory]=useState<{id:string;created_at:string;maximum_cost_cents:number;project_revision:number;production_revision:number;decision:string}[]>([]);
 const [historyMessage,setHistoryMessage]=useState('');
 const [authorizationMessage,setAuthorizationMessage]=useState('');
 const [draftMessage,setDraftMessage]=useState('');
 const [quoteMessage,setQuoteMessage]=useState('');
 async function check(){
  setAuthorizationMessage('');setDraftMessage('');setQuoteMessage('');
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
  setAuthorizationMessage('');
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
 async function checkAuthorizationReadiness(){
  setAuthorizationMessage('');
  if(!result?.ready||!preview){setAuthorizationMessage('Blocked · Run production readiness, preparation, and queue preview first.');return;}
  try{
   const params=new URLSearchParams({projectId,productionId});
   const [preflightResponse,historyResponse]=await Promise.all([
    fetch('/api/generation-preflight?'+params,{cache:'no-store',credentials:'same-origin'}),
    fetch('/api/generation-approval-reviews?'+params,{cache:'no-store',credentials:'same-origin'})
   ]);
   if(!preflightResponse.ok||!historyResponse.ok)throw new Error('Could not verify current production and saved review.');
   const current=await preflightResponse.json();
   const history=await historyResponse.json();
   if(current.ready!==true||current.generationEnabled!==false||history.status!=='history'||history.generationEnabled!==false||!Array.isArray(history.records))throw new Error('Verification failed closed.');
   if(current.projectRevision!==result.projectRevision||current.productionRevision!==result.productionRevision||current.budgetCapCents!==result.budgetCapCents)throw new Error('Production changed. Run readiness and preview again.');
   const matching=history.records.some((r:{decision:string;project_revision:number;production_revision:number;maximum_cost_cents:number})=>r.decision==='reviewed_only'&&r.project_revision===current.projectRevision&&r.production_revision===current.productionRevision&&r.maximum_cost_cents===current.budgetCapCents);
   if(!matching)throw new Error('No saved acknowledgment matches the current production and budget.');
   setAuthorizationMessage('Planning checks passed · Saved review matches current revisions and budget. This is NOT authorization to generate or spend.');
  }catch(e){setAuthorizationMessage('Blocked · '+(e instanceof Error?e.message:'Verification unavailable'));}
 }
 async function inspectJobDraft(){
  setDraftMessage('');
  if(!result?.ready||!preview){setDraftMessage('Blocked · Complete the production readiness and queue preview first.');return;}
  try{
   const params=new URLSearchParams({projectId,productionId});
   const [preflightResponse,historyResponse]=await Promise.all([
    fetch('/api/generation-preflight?'+params,{cache:'no-store',credentials:'same-origin'}),
    fetch('/api/generation-approval-reviews?'+params,{cache:'no-store',credentials:'same-origin'})
   ]);
   if(!preflightResponse.ok||!historyResponse.ok)throw new Error('Live production or saved review could not be verified.');
   const current=await preflightResponse.json();
   const history=await historyResponse.json();
   if(current.ready!==true||current.generationEnabled!==false||history.status!=='history'||history.generationEnabled!==false||!Array.isArray(history.records))throw new Error('Production checks failed.');
   if(current.projectRevision!==result.projectRevision||current.productionRevision!==result.productionRevision||current.budgetCapCents!==result.budgetCapCents)throw new Error('Saved production changed. Refresh readiness and preview.');
   const reviewed=history.records.some((r:{decision:string;project_revision:number;production_revision:number;maximum_cost_cents:number})=>r.decision==='reviewed_only'&&r.project_revision===current.projectRevision&&r.production_revision===current.productionRevision&&r.maximum_cost_cents===current.budgetCapCents);
   if(!reviewed)throw new Error('No matching saved review.');
   setDraftMessage('Planning review verified · Draft blocked: provider credentials and a trustworthy cost estimate have not been verified. No job or payment created.');
  }catch(e){setDraftMessage('Blocked · '+(e instanceof Error?e.message:'Verification unavailable'));}
 }
 async function inspectProviderPricing(){
  setQuoteMessage('');
  if(!result?.ready||!preview){setQuoteMessage('Blocked · Complete production readiness and queue preview first.');return;}
  try{
   const params=new URLSearchParams({projectId,productionId});
   const [preflightResponse,historyResponse]=await Promise.all([
    fetch('/api/generation-preflight?'+params,{cache:'no-store',credentials:'same-origin'}),
    fetch('/api/generation-approval-reviews?'+params,{cache:'no-store',credentials:'same-origin'})
   ]);
   if(!preflightResponse.ok||!historyResponse.ok)throw new Error('Production or saved acknowledgment unavailable.');
   const current=await preflightResponse.json();
   const history=await historyResponse.json();
   if(current.ready!==true||current.generationEnabled!==false||history.status!=='history'||history.generationEnabled!==false||!Array.isArray(history.records))throw new Error('Planning verification failed.');
   if(current.projectRevision!==result.projectRevision||current.productionRevision!==result.productionRevision||current.budgetCapCents!==result.budgetCapCents)throw new Error('Production changed. Repeat readiness and preview.');
   if(!history.records.some((r:{decision:string;project_revision:number;production_revision:number;maximum_cost_cents:number})=>r.decision==='reviewed_only'&&r.project_revision===current.projectRevision&&r.production_revision===current.productionRevision&&r.maximum_cost_cents===current.budgetCapCents))throw new Error('Matching saved review required.');
   setQuoteMessage('Planning review verified · Provider pricing blocked: no verified provider/model quote, currency, or expiry has been supplied. $'+(current.budgetCapCents/100).toFixed(2)+' maximum budget · No charge.');
  }catch(e){setQuoteMessage('Blocked · '+(e instanceof Error?e.message:'Provider pricing verification unavailable'));}
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
  <button type="button" className="smallAction" onClick={loadHistory} disabled={savingReview}>View saved review history</button>
  {historyMessage&&<p className="muted" role="status">{historyMessage}</p>}{reviewHistory.length>0&&<div><h3>Saved approval reviews</h3><ul>{reviewHistory.map(r=><li key={r.id}>{new Date(r.created_at).toLocaleString()} · Maximum ${(r.maximum_cost_cents/100).toFixed(2)} · Bible {r.project_revision} · Storyboard {r.production_revision} · Review only</li>)}</ul></div>}
  <button type="button" className="smallAction" onClick={checkAuthorizationReadiness}>Check Phase 13 planning readiness · No charge</button>
  {authorizationMessage&&<p role="status">{authorizationMessage}</p>}
  <button type="button" className="smallAction" onClick={inspectJobDraft}>Inspect Phase 14 job draft · No charge</button>
  {draftMessage&&<p role="status">{draftMessage}</p>}
  <button type="button" className="smallAction" onClick={inspectProviderPricing}>Inspect Phase 15 provider pricing · No charge</button>
  {quoteMessage&&<p role="status">{quoteMessage}</p>}
  {error&&<p role="alert">{error}</p>}
  {result&&<div role="status" style={{marginTop:12}}>
   <strong>{result.ready?'Ready for future generation setup':'Not ready for generation'}</strong>
   {result.issues.length>0&&<ul>{result.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul>}
   <p className="muted">Saved revisions: Bible {result.projectRevision} · Storyboard {result.productionRevision} · Budget cap ${(result.budgetCapCents/100).toFixed(2)}</p>
   {result.ready&&<button type="button" className="smallAction" disabled={preparing||loading} onClick={prepare}>{preparing?'Preparing safely…':'Prepare generation · No charge'}</button>}
   {prepared&&<p><strong>Preparation verified · Planning only</strong></p>}
   {prepared&&<button type="button" className="smallAction" disabled={previewing||preparing} onClick={previewQueue}>{previewing?'Checking queue proposal…':'Preview generation queue · No charge'}</button>}
   {preview&&<div><p role="status"><strong>Queue preview ready · Awaiting explicit approval</strong> — No job created, no provider contacted, and no payment authorized.</p><label style={{display:'block',marginTop:12}}><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/> I have reviewed the ${(result.budgetCapCents/100).toFixed(2)} maximum budget and understand this is a planning-only review.</label><p className="muted">{acknowledged?'Approval review acknowledged locally · Not submitted':'Approval review requires your confirmation. No job will be created.'}</p><button type="button" className="smallAction" disabled={!acknowledged||savingReview||reviewSaved} onClick={saveReview}>{savingReview?'Saving review…':reviewSaved?'Review saved · No charge':'Save acknowledgment · No charge'}</button>{reviewSaved&&<p role="status"><strong>Review recorded · Planning only.</strong> No paid job authorized.</p>}<p className="muted">This records acknowledgment only. Paid job submission and AI generation remain disabled.</p></div>}
   <p className="muted">AI generation remains disabled. This check does not create jobs, reserve funds, or incur charges.</p>
  </div>}
 </section>;
}
+(current.budgetCapCents/100).toFixed(2)+' maximum budget · No charge.');
  }catch(e){setQuoteMessage('Blocked · '+(e instanceof Error?e.message:'Provider pricing verification unavailable'));}
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
  <button type="button" className="smallAction" onClick={loadHistory} disabled={savingReview}>View saved review history</button>
  {historyMessage&&<p className="muted" role="status">{historyMessage}</p>}{reviewHistory.length>0&&<div><h3>Saved approval reviews</h3><ul>{reviewHistory.map(r=><li key={r.id}>{new Date(r.created_at).toLocaleString()} · Maximum ${(r.maximum_cost_cents/100).toFixed(2)} · Bible {r.project_revision} · Storyboard {r.production_revision} · Review only</li>)}</ul></div>}
  <button type="button" className="smallAction" onClick={checkAuthorizationReadiness}>Check Phase 13 planning readiness · No charge</button>
  {authorizationMessage&&<p role="status">{authorizationMessage}</p>}
  <button type="button" className="smallAction" onClick={inspectJobDraft}>Inspect Phase 14 job draft · No charge</button>
  {draftMessage&&<p role="status">{draftMessage}</p>}
  {error&&<p role="alert">{error}</p>}
  {result&&<div role="status" style={{marginTop:12}}>
   <strong>{result.ready?'Ready for future generation setup':'Not ready for generation'}</strong>
   {result.issues.length>0&&<ul>{result.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul>}
   <p className="muted">Saved revisions: Bible {result.projectRevision} · Storyboard {result.productionRevision} · Budget cap ${(result.budgetCapCents/100).toFixed(2)}</p>
   {result.ready&&<button type="button" className="smallAction" disabled={preparing||loading} onClick={prepare}>{preparing?'Preparing safely…':'Prepare generation · No charge'}</button>}
   {prepared&&<p><strong>Preparation verified · Planning only</strong></p>}
   {prepared&&<button type="button" className="smallAction" disabled={previewing||preparing} onClick={previewQueue}>{previewing?'Checking queue proposal…':'Preview generation queue · No charge'}</button>}
   {preview&&<div><p role="status"><strong>Queue preview ready · Awaiting explicit approval</strong> — No job created, no provider contacted, and no payment authorized.</p><label style={{display:'block',marginTop:12}}><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/> I have reviewed the ${(result.budgetCapCents/100).toFixed(2)} maximum budget and understand this is a planning-only review.</label><p className="muted">{acknowledged?'Approval review acknowledged locally · Not submitted':'Approval review requires your confirmation. No job will be created.'}</p><button type="button" className="smallAction" disabled={!acknowledged||savingReview||reviewSaved} onClick={saveReview}>{savingReview?'Saving review…':reviewSaved?'Review saved · No charge':'Save acknowledgment · No charge'}</button>{reviewSaved&&<p role="status"><strong>Review recorded · Planning only.</strong> No paid job authorized.</p>}<p className="muted">This records acknowledgment only. Paid job submission and AI generation remain disabled.</p></div>}
   <p className="muted">AI generation remains disabled. This check does not create jobs, reserve funds, or incur charges.</p>
  </div>}
 </section>;
}