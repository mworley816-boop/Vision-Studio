import {remainingCents,assertCents} from './budget.mjs';
import {queueShot,finishShot,cancelShot} from './production-engine.mjs';

/** Provider prices are user-supplied quotes in cents, never hard-coded market claims. */
export function defineProvider({id,kind,estimatedCents,maximumCents,enabled=false}){
 if(!/^[a-z0-9_-]+$/i.test(id||''))throw new Error('Invalid provider ID');
 if(!['motion','still','local-animation'].includes(kind))throw new Error('Unsupported generation method');
 assertCents(estimatedCents);assertCents(maximumCents);
 if(maximumCents<estimatedCents)throw new Error('Maximum charge below estimate');
 return Object.freeze({id,kind,estimatedCents,maximumCents,enabled:!!enabled});
}
export function chooseProvider(production,providers,{preferredKind='motion'}={}){
 const available=remainingCents(production.kind,production.spentCents,production.reservedCents);
 const eligible=providers.filter(p=>p.enabled&&p.maximumCents>0&&p.maximumCents<=available);
 const order=['motion','still','local-animation'];
 const ranked=eligible.sort((a,b)=>(a.kind===preferredKind?-1:order.indexOf(a.kind))-(b.kind===preferredKind?-1:order.indexOf(b.kind))||a.maximumCents-b.maximumCents);
 return ranked[0]||null;
}
/** Local queue state only; paid API execution is intentionally not implemented. */
export function enqueueGeneration(production,plan,sceneId,provider,jobId){
 if(!provider?.enabled)throw new Error('Provider not enabled');
 const {production:next,plan:nextPlan}=queueShot(production,plan,sceneId,jobId,provider.maximumCents);
 return {production:next,plan:nextPlan,job:{id:jobId,sceneId,providerId:provider.id,status:'queued',reservedCents:provider.maximumCents}};
}
export function completeGeneration(production,plan,job,actualCents,assetId){
 if(job.status!=='queued')throw new Error('Job not queued');
 if(actualCents>job.reservedCents)throw new Error('Provider charged beyond reserved maximum; reconcile manually');
 const result=finishShot(production,plan,job.sceneId,actualCents,assetId);
 return {...result,job:{...job,status:'completed',actualCents,assetId}};
}
export function failGeneration(production,plan,job,reason='Generation failed'){
 if(job.status!=='queued')throw new Error('Job not queued');
 const result=cancelShot(production,plan,job.sceneId);
 return {...result,job:{...job,status:'failed',reason}};
}
export function validateProviderQuote(quote){
 if(!quote||!Number.isSafeInteger(quote.maximumCents)||quote.maximumCents<=0)throw new Error('Provider maximum price required');
 if(!quote.currency||quote.currency!=='USD')throw new Error('Only USD pricing is supported');
 if(!quote.verifiedAt)throw new Error('Provider quote verification timestamp required');
 return true;
}
