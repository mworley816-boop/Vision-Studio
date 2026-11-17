import {NextResponse} from 'next/server';
import {inspectSpendingLedgerReadiness} from '../../../lib/cloud/spending-ledger-readiness.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 return NextResponse.json(inspectSpendingLedgerReadiness(),{headers:{'Cache-Control':'private, no-store'}});
}
