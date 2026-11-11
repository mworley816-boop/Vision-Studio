/** Phase 24: server-only, provider-neutral quote and charge reconciliation.
 * This module does not call providers or grant permission to spend.
 * All money is integer USD cents; the database must enforce reservations atomically.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cents=n=>Number.isSafeInteger(n)&&n>=0;
const token=s=>typeof s==='string'&&s.length>=8&&s.length<=200&&/^[a-zA-Z0-9_:\-.]+$/.test(s);
const kinds=Object.freeze({music:500,episode:2000});
function requireDb(db){if(!db||typeof db.callInternal!=='function')throw new Error('Server-only database transport required');}
async function call(db,name,args){requireDb(db);const result=await db.callInternal(name,args);if(!result||result.error)throw new Error(`Database ${name} failed`);return result.data;}
export function validateProviderQuote(quote,{now=Date.now()}={}){
 if(!quote||typeof quote!=='object'||Array.isArray(quote))throw new Error('Invalid quote');
 const {productionId,kind,provider,model,priceCents,currency='USD',expiresAt,quoteId}=quote;
 if(!UUID.test(productionId||'')||!Object.hasOwn(kinds,kind))throw new Error('Invalid production');
 if(typeof provider!=='string'||!/^[a-z][a-z0-9_-]{1,39}$/.test(provider)||!token(model)||!token(quoteId))throw new Error('Invalid provider quote identity');
 if(currency!=='USD'||!cents(priceCents)||priceCents===0||priceCents>kinds[kind])throw new Error('Quote exceeds permitted budget or currency');
 const expiry=Date.parse(expiresAt);if(!Number.isFinite(expiry)||expiry<=now||expiry>now+24*3600_000)throw new Error('Quote expired or validity too long');
 return Object.freeze({productionId,kind,provider,model,priceCents,currency,expiresAt:new Date(expiry).toISOString(),quoteId});
}
export function authorizeProviderSubmission({quote,reservation,approvalRequired=true,approved=false,now=Date.now()}){
 const q=validateProviderQuote(quote,{now});
 if(approvalRequired&&!approved)throw new Error('Generation approval required');
 if(!reservation||reservation.productionId!==q.productionId||reservation.quoteId!==q.quoteId||reservation.status!=='reserved'||!cents(reservation.amountCents)||reservation.amountCents<q.priceCents)throw new Error('Matching committed reservation required');
 if(!token(reservation.idempotencyKey))throw new Error('Provider idempotency key required');
 return Object.freeze({provider:q.provider,model:q.model,quoteId:q.quoteId,productionId:q.productionId,maxChargeCents:q.priceCents,idempotencyKey:reservation.idempotencyKey});
}
/** No blind retries: the provider must document idempotent request handling. */
export async function submitReservedProviderJob(adapter,authorization,payload){
 if(!adapter||adapter.supportsIdempotency!==true||typeof adapter.submit!=='function')throw new Error('Verified idempotent provider adapter required');
 if(!authorization||!token(authorization.idempotencyKey)||!cents(authorization.maxChargeCents))throw new Error('Invalid authorization');
 const result=await adapter.submit({model:authorization.model,payload,idempotencyKey:authorization.idempotencyKey,maxChargeCents:authorization.maxChargeCents});
 if(!result||!token(result.requestId)||result.idempotencyKey!==authorization.idempotencyKey)throw new Error('Provider submission unverified; quarantine for reconciliation');
 return Object.freeze({requestId:result.requestId,idempotencyKey:result.idempotencyKey,status:'submitted'});
}
export function classifyProviderCharge({reservation,receipt}){
 if(!reservation||!cents(reservation.amountCents)||!token(reservation.idempotencyKey))throw new Error('Invalid reservation');
 if(!receipt||receipt.verified!==true||receipt.idempotencyKey!==reservation.idempotencyKey||!cents(receipt.chargeCents)||receipt.currency!=='USD'||!token(receipt.receiptId))return {action:'quarantine',reason:'unverified_receipt'};
 if(receipt.chargeCents>reservation.amountCents)return {action:'quarantine',reason:'charge_exceeds_reservation'};
 return {action:'settle',chargeCents:receipt.chargeCents,releaseCents:reservation.amountCents-receipt.chargeCents,receiptId:receipt.receiptId};
}
/** Final accounting is a single database transaction, never separate client writes. */
export async function reconcileProviderCharge(db,{reservationId,reservation,receipt}){
 if(!UUID.test(reservationId||''))throw new Error('Invalid reservation identifier');
 const decision=classifyProviderCharge({reservation,receipt});
 if(decision.action!=='settle')return decision;
 const result=await call(db,'settle_provider_charge',{p_reservation:reservationId,p_receipt_id:decision.receiptId,p_charge_cents:decision.chargeCents,p_idempotency_key:reservation.idempotencyKey});
 if(result!==true)throw new Error('Atomic settlement was not confirmed');
 return {...decision,committed:true};
}
