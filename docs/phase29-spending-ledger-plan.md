# Phase 29 — Verified spending ledger integration plan (design only)

Status: **NOT IMPLEMENTED**. No migration is applied and no payment or generation functionality is enabled.

## Existing assets and limitations

- `supabase/phase9-schema.sql` defines owner-scoped productions and the fixed 500/2000-cent caps.
- `supabase/phase22-queue.sql` is a **draft**, with a `studio_paid_jobs` table, reservation/reconciliation functions and read-only owner RLS. Presence in Git does not prove it was applied to production.
- `/api/spending-ledger-readiness` deliberately reports **not_ready**.
- `/api/production-budget-preview` accepts hypothetical amounts from the browser and MUST NOT be used as an authoritative ledger.
- Current UI preview assumes 0 cents spent and reserved, which is NOT a verified balance.

## Proposed read-only rollout

1. Identify the dedicated Vision Studio Supabase project without exposing secrets; inspect actual deployed schema and RLS policies. Do not assume `studio_paid_jobs` exists.
2. Confirm whether paid-job records exist and whether each completed/failed job has a provider-verified final charge. Missing or ambiguous actual charges MUST block a verified-balance result.
3. Implement a server-authenticated, production-owner-scoped **read-only** endpoint. Use Supabase SSR session and `auth.getUser()` or equivalent trusted verification, not a client-supplied owner ID. Never expose service credentials in browser code.
4. Calculate `spentCents` from independently reconciled final charges and `reservedCents` from unsettled maximum charges. Treat `needs_reconciliation`, unknown charges, missing records, or inconsistent state as **not verified**.
5. Return `actualAvailableBalanceVerified:true` ONLY after schema, ownership, complete records, and reconciliation are verified. A missing ledger is not an empty ledger.
6. Use a single authoritative budget source and preserve $5 music / $20 episode limits. Display ledger source, verification timestamp and an explicit no-generation notice.
7. Test cross-owner access denial, missing tables, stale/partial records, concurrent reservations, over-budget records, null actual charges, and missing session. Run database security advisors before any rollout.
8. Deploy the read-only endpoint separately from any paid-job creation. Do not enable generation, provider credentials, charges, or automated reservations in this phase.

## Release gates

- [ ] Confirm dedicated database and actual applied schema
- [ ] Verify row-level security and owner isolation
- [ ] Confirm provider-reconciled charge semantics
- [ ] Implement authenticated read-only ledger endpoint
- [ ] Pass database integration and authorization tests
- [ ] Explicit human approval for any later migration or paid functionality

**No database migration, table creation, privileged RPC execution, reservation, provider request, or payment is authorized by this document.**
