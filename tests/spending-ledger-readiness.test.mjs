import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSpendingLedgerReadiness} from '../lib/cloud/spending-ledger-readiness.mjs';
test('unconfigured ledger fails closed without claiming an actual balance',()=>{
 const result=inspectSpendingLedgerReadiness();
 assert.equal(result.status,'not_ready');
 assert.equal(result.actualAvailableBalanceVerified,false);
 assert.equal(result.paymentAuthorized,false);
 assert.ok(result.reasons.some(x=>x.includes('authoritative spending ledger')));
});
test('caller supplied readiness flags cannot authorize money',()=>{
 const result=inspectSpendingLedgerReadiness({ledgerConfigured:true,authenticated:true,ownershipVerified:true,recordsVerified:true});
 assert.equal(result.status,'not_ready');
 assert.equal(result.generationEnabled,false);
 assert.equal(result.paymentAuthorized,false);
});
