import {NextResponse} from 'next/server';
import {inspectTrustedProviderQuote} from '../../../../lib/cloud/trusted-provider-quote.mjs';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, max-age=0'};

/**
 * Phase 16 read-only status. No request parameters or caller-supplied evidence
 * are trusted. A real provider catalog must be independently verified and
 * configured server-side before a quote can pass. No network/provider calls.
 */
export async function GET(){
 const result=inspectTrustedProviderQuote({
  providerId:'unconfigured',
  modelId:'unconfigured',
  requestedMaxCents:0,
  nowMs:Date.now(),
  quote:null,
  trustedCatalog:null
 });
 return NextResponse.json({...result,phase:16,mode:'planning_only'}, {headers});
}
