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
 const [pricingStatus,setPricingStatus]=useState('');
 const [pricingLoading,setPricingLoading]=useState(false);
 const [evidence,setEvidence]=useState({providerId:'',modelId:'',sourceUrl:'',unitCostCents:'',validUntil:''});
 const [evidenceMessage,setEvidenceMessage]=useState('');
 const [evidenceLoading,setEvidenceLoading]=useState(false);
 const [runwayConnectionMessage,setRunwayConnectionMessage]=useState('');
 const [runwayConnectionLoading,setRunwayConnectionLoading]=useState(false);
 async function inspectRunwayConnection(){
  setRunwayConnectionMessage('');setRunwayConnectionLoading(true);
  try{
   const response=await fetch('/api/runway-connection',{method:'POST',credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw new Error('Owner access or connection check unavailable');
   const result=await response.json();
   if(result.generationEnabled!==false||result.providerCalled!==false||result.jobCreated!==false||result.paymentAuthorized!==false)throw new Error('Unexpected connection safety response');
   const statuses:{[key:string]:string}={not_configured:'Runway API secret is not configured on the server.',connected_read_only:'Runway credentials accepted. Pricing and generation remain blocked.',authentication_rejected:'Runway rejected the API credentials.',unverified:'Runway returned an unexpected response.',unavailable:'Runway connection unavailable.',timed_out:'Runway connection timed out after 10 seconds.',network_unavailable:'Runway network request failed before an HTTP response.',request_rejected:'Runway rejected the read-only request (HTTP 400).',endpoint_not_found:'Runway organization endpoint not found (HTTP 404).',rate_limited:'Runway rate limit reached (HTTP 429).',provider_error:'Runway service returned an HTTP 5xx error.'};
   setRunwayConnectionMessage(statuses[result.status]||'Connection could not be verified.');
  }catch(e){setRunwayConnectionMessage(e instanceof Error?e.message:'Connection check unavailable');}
  finally{setRunwayConnectionLoading(false);}
 }

 async function inspectEvidence(){
  setEvidenceMessage('');setEvidenceLoading(true);
  try{
   const response=await fetch('/api/provider-evidence-preview',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(evidence)});
   if(!response.ok)throw new Error('Evidence preview endpoint unavailable');
   const data=await response.json();
   if(data.generationEnabled!==false||data.providerCalled!==false||data.jobCreated!==false||data.paymentAuthorized!==false||data.trustedProviderPricing!==false)throw new Error('Unexpected safety response');
   setEvidenceMessage(data.status==='unverified_evidence_preview'?'Fields structurally valid only. Price and source are NOT independently verified. Generation blocked.':('Blocked · '+String(data.reason||'Invalid evidence')+'. No charge.'));
  }catch(e){setEvidenceMessage('Blocked · '+(e instanceof Error?e.message:'Preview unavailable'))}
  finally{setEvidenceLoading(false)}
 }

 const [planScenes,setPlanScenes]=useState('5');
 const [planSeconds,setPlanSeconds]=useState('10');
 const [planKind,setPlanKind]=useState<'music'|'episode'>('music');
 const [planMessage,setPlanMessage]=useState('');
 const [planLoading,setPlanLoading]=useState(false);
 const [budgetInputs,setBudgetInputs]=useState({clipCents:'50',retries:'1',assets:'50',audio:'60',other:'40'});
 const [budgetMessage,setBudgetMessage]=useState('');
 const [budgetLoading,setBudgetLoading]=useState(false);
 async function inspectFullBudget(){
  if(budgetLoading)return;
  setBudgetMessage('');
  const values=[planScenes,budgetInputs.clipCents,budgetInputs.retries,budgetInputs.assets,budgetInputs.audio,budgetInputs.other];
  if(values.some(value=>!/^[0-9]{1,6}$/.test(value))||Number(planScenes)<1||Number(planScenes)>500||Number(budgetInputs.retries)>500){setBudgetMessage('Enter valid whole-number estimates and 1–500 scenes.');return;}
  const [clipCount,videoClipCents,retryCount,imageAssetCents,audioCents,otherCents]=values.map(Number);
  setBudgetLoading(true);
  try{
   const response=await fetch('/api/production-budget-preview',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:planKind,clipCount,videoClipCents,retryCount,imageAssetCents,audioCents,otherCents,spentCents:0,reservedCents:0})});
   if(!response.ok)throw new Error('Server budget preview unavailable');
   const data=await response.json();
   if(data.mode!=='illustrative_only'||data.balanceSource!=='manual_hypothetical'||data.actualAvailableBalanceVerified!==false||data.mayAuthorizeGeneration!==false||data.trustedProviderPricing!==false||data.generationEnabled!==false||data.providerCalled!==false||data.jobCreated!==false||data.paymentAuthorized!==false||!['blocked','budget_checked_only'].includes(data.status))throw new Error('Unexpected budget response');
   if(data.status==='blocked'){setBudgetMessage('Server blocked estimate: '+String(data.reason||'Budget validation failed')+' · No charge.');return;}
   if(!Number.isSafeInteger(data.estimatedCostCents)||!Number.isSafeInteger(data.maximumCostCents))throw new Error('Invalid server budget result');
   setBudgetMessage('Server-checked hypothetical full cost (assumes $0 spent and reserved): $'+(data.estimatedCostCents/100).toFixed(2)+' / $'+(data.maximumCostCents/100).toFixed(2)+' cap · NOT verified provider pricing · No charge.');
  }catch(e){setBudgetMessage(e instanceof Error?e.message:'Server budget preview unavailable')}
  finally{setBudgetLoading(false)}
 }
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
 async function inspectPhase16Pricing(){
  setPricingLoading(true);setPricingStatus('');
  try{
   const response=await fetch('/api/provider-pricing-status',{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)throw new Error('Pricing status endpoint unavailable');
   const data=await response.json();
   if(data.phase!==16||data.mode!=='planning_only'||data.generationEnabled!==false||data.providerCalled!==false||data.jobCreated!==false||data.paymentAuthorized!==false||data.status!=='blocked')throw new Error('Unexpected pricing status. Generation remains disabled.');
   setPricingStatus('Phase 16 · Provider pricing blocked: '+String(data.reason||'No trusted provider quote configured')+'. No charge.');
  }catch(e){setPricingStatus('Phase 16 unavailable · '+(e instanceof Error?e.message:'Could not verify pricing')+'. Generation remains disabled.');}
  finally{setPricingLoading(false)}
 }
 async function inspectProductionCost(){
  setPlanMessage('');
  if(!/^[1-9][0-9]{0,2}$/.test(planScenes)||!/^[1-9][0-9]{0,2}$/.test(planSeconds)||Number(planScenes)>500||Number(planSeconds)>30){
   setPlanMessage('Enter 1–500 scenes and 1–30 seconds per scene.');return;
  }
  setPlanLoading(true);
  try{
   const params=new URLSearchParams({kind:planKind,scenes:planScenes,seconds:planSeconds});
   const response=await fetch('/api/production-cost-estimate?'+params,{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)throw new Error('Cost planning endpoint unavailable');
   const data=await response.json();
   if(data.phase!==18||data.mode!=='planning_only'||data.status!=='blocked'||data.generationEnabled!==false||data.providerCalled!==false||data.jobCreated!==false||data.paymentAuthorized!==false)throw new Error('Unexpected planning result');
   setPlanMessage('Pricing unavailable · '+String(data.reason||'No trusted pricing')+'. No charge.');
  }catch(e){setPlanMessage('Cost planning blocked · '+(e instanceof Error?e.message:'Verification unavailable'));}
  finally{setPlanLoading(false)}
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
  <details style={{marginTop:12,padding:12,border:'1px solid #856b87',borderRadius:10}}><summary style={{cursor:'pointer',fontWeight:600}}>Provider setup requirements · No charge</summary><p className="muted">These are the remaining prerequisites for evaluating real generation pricing. This panel does not validate a provider or enable generation.</p><ol><li>Choose a video-generation provider and exact model that supports the planned clips.</li><li>Configure provider credentials privately on the server. Never paste API keys into the storyboard or GitHub issues.</li><li>Obtain a trustworthy, current price quote with currency, units, provider/model identity and expiration.</li><li>Calculate total expected clip, retry, image, audio and other costs against the saved $5 music-video or $20 episode hard cap.</li><li>Verify quote and credentials server-side, then review a separate explicit approval before any paid job can be submitted.</li></ol><p className="muted">Current status: pricing and provider execution are blocked. A planning acknowledgment is not spending authorization.</p></details>
  <details style={{marginTop:12,padding:12,border:'1px solid #856b87',borderRadius:10}}><summary style={{cursor:'pointer',fontWeight:600}}>Runway API connection · No charge</summary><p className="muted">Checks the server-configured Runway credentials using an authenticated read-only request. Only enrolled studio owners can run this. Never paste your API key into this page.</p><button type="button" className="smallAction" disabled={runwayConnectionLoading} onClick={inspectRunwayConnection}>{runwayConnectionLoading?'Checking…':'Check Runway connection · No charge'}</button>{runwayConnectionMessage&&<p role="status">{runwayConnectionMessage}</p>}<p className="muted">Connection success does not verify pricing or authorize video generation.</p></details>\n  <details style={{marginTop:12,padding:12,border:'1px solid #856b87',borderRadius:10}}><summary style={{cursor:'pointer',fontWeight:600}}>Preview provider pricing evidence · No charge</summary><p className="muted">Manually entered fields are checked for format only. No price is verified, saved as trusted, or used for generation.</p>{([['providerId','Provider ID (for example, runway)'],['modelId','Model ID'],['sourceUrl','Official HTTPS pricing URL'],['unitCostCents','USD cents per output second (whole number)'],['validUntil','Evidence expiration (ISO date/time)']] as const).map(([key,label])=><label key={key} style={{display:'block',marginTop:8}}>{label}<input style={{display:'block',width:'100%',maxWidth:480}} type="text" value={evidence[key]} onChange={e=>setEvidence(old=>({...old,[key]:e.target.value}))}/></label>)}<button type="button" className="smallAction" disabled={evidenceLoading} onClick={inspectEvidence}>{evidenceLoading?'Validating fields…':'Preview evidence format · No charge'}</button>{evidenceMessage&&<p role="status">{evidenceMessage}</p>}<p className="muted">Never enter API keys here. This cannot verify source authenticity, billing rules or real-world costs.</p></details>
  <button type="button" className="smallAction" disabled={pricingLoading} onClick={inspectPhase16Pricing}>{pricingLoading?'Checking trusted pricing…':'Inspect Phase 16 trusted pricing · No charge'}</button>
  {pricingStatus&&<p role="status">{pricingStatus}</p>}
  <div style={{marginTop:16}}>
   <h3>Phase 19 · Production cost planning</h3>
   <p className="muted">Planning only. Verified provider prices are not configured; no charges or generation.</p>
   <label style={{display:'block'}}>Production type <select value={planKind} onChange={e=>setPlanKind(e.target.value as 'music'|'episode')}><option value="music">Music video · $5 maximum</option><option value="episode">Episode · $20 maximum</option></select></label>
   <label style={{display:'block'}}>Number of scenes <input type="number" min="1" max="500" step="1" value={planScenes} onChange={e=>setPlanScenes(e.target.value)}/></label>
   <label style={{display:'block'}}>Seconds per scene <input type="number" min="1" max="30" step="1" value={planSeconds} onChange={e=>setPlanSeconds(e.target.value)}/></label>
   <p className="muted">Planned duration: {Number(planScenes)>0&&Number(planSeconds)>0&&Number.isFinite(Number(planScenes)*Number(planSeconds))?Number(planScenes)*Number(planSeconds):0} seconds · Budget cap ${planKind==='music'?'5.00':'20.00'}</p>
   <button type="button" className="smallAction" disabled={planLoading} onClick={inspectProductionCost}>{planLoading?'Checking estimate…':'Check Phase 19 cost plan · No charge'}</button>
   {planMessage&&<p role="status">{planMessage}</p>}
  </div>
  <div style={{marginTop:16}}>
   <h3>Phase 24 · Full production budget preview</h3>
   <p className="muted">Hypothetical manual amounts only. Assumes $0 spent and $0 reserved; actual available balance is NOT verified. Not a provider quote or paid authorization.</p>
   {([['clipCents','Estimated cents per clip'],['retries','Retry clips'],['assets','Image assets (cents)'],['audio','Audio (cents)'],['other','Other costs (cents)']] as const).map(([key,label])=><label key={key} style={{display:'block'}}>{label} <input type="number" min="0" step="1" value={budgetInputs[key]} onChange={e=>setBudgetInputs(old=>({...old,[key]:e.target.value}))}/></label>)}
   <button type="button" className="smallAction" disabled={budgetLoading} onClick={inspectFullBudget}>{budgetLoading?'Checking server budget…':'Preview Phase 26 full budget · No charge'}</button>
   {budgetMessage&&<p role="status">{budgetMessage}</p>}
   </div>
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
