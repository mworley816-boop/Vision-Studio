import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mayInspectProduction} from '../lib/cloud/ledger-access.mjs';
import {inspectSpendingLedgerReadiness} from '../lib/cloud/spending-ledger-readiness.mjs';
const route=readFileSync(new URL('../app/api/spending-ledger-readiness/route.ts',import.meta.url),'utf8');
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const p='33333333-3333-4333-8333-333333333333';
test('local cross-owner denial matrix rejects another owner, missing row, and wrong requested production',()=>{
 const record={id:p,owner_id:a};
 assert.equal(mayInspectProduction({userId:a,production:record,requestedProductionId:p}),true);
 assert.equal(mayInspectProduction({userId:b,production:record,requestedProductionId:p}),false);
 assert.equal(mayInspectProduction({userId:a,production:null,requestedProductionId:p}),false);
 assert.equal(mayInspectProduction({userId:a,production:record,requestedProductionId:b}),false);
});
test('ledger route uses verified session and owner-scoped read, not caller owner input',()=>{
 for(const token of ['auth.getUser()',"from('studio_productions')","eq('owner_id',user.id)",'mayInspectProduction','productionIdIsValid','Cache-Control',"'private, no-store'"])assert.ok(route.includes(token),token);
 assert.doesNotMatch(route,/service_role|SUPABASE_SERVICE_ROLE_KEY|request\.headers\.get\(['"]x-owner/i);
});
test('all hypothetical readiness flags remain blocked without ledger',()=>{
 for(const authenticated of [false,true])for(const ownershipVerified of [false,true])for(const recordsVerified of [false,true]){
  const result=inspectSpendingLedgerReadiness({ledgerConfigured:true,authenticated,ownershipVerified,recordsVerified});
  assert.equal(result.status,'not_ready');
  assert.equal(result.actualAvailableBalanceVerified,false);
  assert.equal(result.paymentAuthorized,false);
  assert.equal(result.generationEnabled,false);
 }
});
