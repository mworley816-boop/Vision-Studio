/** Phase 28: fail-closed spending ledger readiness.
 * A browser estimate is never a verified spending ledger.
 * No database writes, provider calls, reservations, or charges.
 */
export function inspectSpendingLedgerReadiness({ledgerConfigured=false,authenticated=false,ownershipVerified=false,recordsVerified=false}={}){
 const blockedReasons=[];
 if(!ledgerConfigured)blockedReasons.push('No authoritative spending ledger configured');
 if(!authenticated)blockedReasons.push('User session not verified for ledger access');
 if(!ownershipVerified)blockedReasons.push('Production ownership not verified');
 if(!recordsVerified)blockedReasons.push('Spent and reserved amounts not verified');
 return Object.freeze({
  status:'not_ready',
  phase:28,
  balanceSource:'unverified',
  actualAvailableBalanceVerified:false,
  reasons:blockedReasons.length?blockedReasons:['Ledger integration requires separate security review'],
  generationEnabled:false,
  providerCalled:false,
  jobCreated:false,
  paymentAuthorized:false
 });
}
