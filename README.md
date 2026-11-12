# Vision Studio — private prototype (Phase 1)

A chic, modern, local-first **planning prototype** for one owner's music-video and animated-series projects.

## Run

Requires Node.js 20+. Run `npm install`, then `npm run dev`, and open http://localhost:3000.

Run budget tests with `npm test`.

## Included
- Multi-project dashboard with separate music and episode projects
- Automatic/approval mode selection per project
- Browser-local project persistence
- Budget library: music hard cap 500 cents; 7-minute episode hard cap 2000 cents
- Episode allocation: motion $10; assets $3; audio $2.40; director $1.60; retry reserve $3
- Pure budget reserve/settle functions and automated tests

## Not yet implemented
- Owner authentication, server-side persistence, encrypted/private asset storage
- Uploads, generation provider APIs, production queue, editing, and exporting
- Server-side budget reservation ledger and transaction locking
- Visual Bible, Continuity Director, episode scripting and character manager

**Security:** This local prototype is NOT a secure deployed private application. Do not deploy it publicly or upload sensitive/private songs until authentication and storage policies are implemented. The budget module is a tested building block, not yet a production billing safeguard. The browser's localStorage is not a secure multi-device database.

## Architecture roadmap
1. Supabase owner-only auth and RLS: projects, productions, scenes, characters, assets, approvals, provider jobs, budget ledger.
2. Transactional budget reservations in database before every paid job; idempotent reconciliation, concurrency-safe locking, cost estimates and stop-on-uncertainty.
3. Server-side provider adapters and a queue worker. No API keys in browser.
4. Audio analysis, Visual Bible, storyboards, approvals and low-cost video production.
5. FFmpeg assembly and downloadable exports.

Music video: $5 max variable spend. Episode: $20 max variable spend. Hosting and fixed subscriptions excluded.

## Phase 2 additions
- Each project opens an isolated workspace with separate production drafts and storyboards.
- Approval-mode storyboards require every scene to be approved before they are marked ready; automatic-mode storyboards do not.
- `lib/workspace.mjs` implements per-production reservation IDs, settlement, and hard-cap enforcement for future provider integrations. **No provider integration exists yet**, so these functions do not bill anyone.
- Projects and drafts are browser-local only and are **not secure/private cloud storage**. Do not upload confidential material until authentication and private storage are implemented.
- Shared scene-entry field is a prototype convenience; scenes are saved to the chosen production when Add scene is clicked.

## Phase 3 additions — Visual Bible and continuity
- Per-project Visual Bible with persistent local style, palette, characters and locations.
- Scene-level character and location references, with approval reset when references change.
- Deterministic continuity checks for unresolved references, missing styles, and cross-project mismatches.
- `buildShotBrief()` produces structured scene identity data for a future AI Director/provider adapter.
- Added five automated Visual Bible tests. The UI currently supports one featured character per scene; the underlying model supports multiple.

**Limitations:** This is a rule-based reference checker, not image-based facial/wardrobe similarity checking. There is no AI provider integration or real video rendering yet. Everything is still stored in local browser storage, so it is not safe for public deployment or confidential uploads.

## Phase 4 — Provider-neutral production engine

`lib/production-engine.mjs` adds `createProductionPlan`, `queueShot`, `finishShot`, `cancelShot`, and `renderManifest`. Planning requires project-matched Visual Bible references and continuity validation. Approval mode requires approved scenes. Each paid-job placeholder reserves budget before execution and settles within that reservation; cancellation releases reserved funds. A render manifest can be prepared only after all scenes have recorded generated asset IDs.

**Not implemented:** AI generation provider calls, durable transactional budget ledger, external billing reconciliation, job workers, FFmpeg rendering, storage, cloud auth, and full app build verification. In-memory logic does not prevent simultaneous requests in a deployed multi-worker service; production deployment requires atomic database reservations and provider-side spending safeguards. Run `npm test` for pure-logic tests.

## Phase 5: Provider-neutral generation orchestration

`lib/generation-engine.mjs` implements a **local-only** provider adapter registry, maximum-charge reservations, affordable-provider selection, fallback from motion to stills, job completion and failure handling, and quote validation. Providers are disabled unless explicitly enabled. No paid services are called and no video is generated by this module. Prices must come from verified provider quotes; they are not hardcoded market prices. The queue is currently in-memory state and **not safe for concurrent paid jobs**. Before connecting real providers, add server-side owner authentication, a transactional database ledger, durable queue, idempotency keys, reconciliation of charges and refunds, secrets management, and webhook verification.

Run `npm test` to execute all logic tests.

## Phase 6 — Offline audio/video render planning

`lib/render-engine.mjs` validates a completed production manifest and creates a deterministic FFmpeg argument array for 16:9 (1920×1080) or 9:16 (1080×1920) H.264/AAC MP4 export. Scene durations must total exactly 180 seconds for music videos or 420 seconds for episodes. Still images are looped, video clips trimmed, all scenes scaled/padded, concatenated, and an optional audio track mapped. Inputs must be absolute paths to approved scene assets; use `ffmpegCommand(prepareRender(...))` to obtain `{binary,args}` and execute with a trusted server-side process runner after verifying paths and file contents. Never pass the arguments through a shell. This module **does not run FFmpeg, synchronize dialogue, download files, inspect codecs, handle transitions, or produce a video yet**. It also does not incur any paid generation charges. For real deployments, add file existence/type probing, sandboxed FFmpeg execution, worker timeouts, safe output paths, and durable job state.

## Phase 7 — Executable local rendering

`lib/render-runner.mjs` runs the validated FFmpeg render plan using Node `spawn` (no shell), checks source files, reports approximate progress, probes the result with FFprobe, verifies duration, video dimensions, and soundtrack presence, then moves the temporary MP4 to its final destination. It cleans up temporary output on failure and refuses to overwrite existing output by default.

Prerequisites: FFmpeg and FFprobe installed and available on PATH. Rendered videos use H.264 and AAC. Rendering is **local**; it does not call AI providers or incur provider charges. Full 3-minute/7-minute renders require actual scene files and appropriate hardware/storage. The automated integration test generates a two-second sample clip and audio and confirms a real export.

Programmatic usage:

```js
import { prepareRender } from './lib/render-engine.mjs';
import { executeRender } from './lib/render-runner.mjs';

const plan = prepareRender(manifest, {
  sceneAssets: { scene1: { assetId: 'approved-asset', path: '/absolute/path/clip.mp4' } },
  sceneDurations: [180],
  audioPath: '/absolute/path/song.wav',
  outputPath: '/absolute/path/finished.mp4',
});
const result = await executeRender(plan, {
  onProgress: ({ percent }) => console.log(`${percent}%`),
});
console.log(result.outputPath);
```

This runner is not exposed as a public web API. Before production deployment, implement authenticated job submission, per-owner filesystem isolation, bounded worker resources, durable job status, and transaction-safe cost accounting for external AI providers.

## Phase 8 — Durable single-machine project and job storage

`lib/local-store.mjs` adds a **local-only** atomic JSON snapshot store for projects, productions, and provider-job state. The `LocalStudioStore` API provides `createProject`, `createProduction`, `queueJob`, `startJob`, `completeJob`, and `stopJob`. It uses owner-only file permissions, write-to-temp/rename, a same-machine lock file, and validates the ledger on every transaction. It preserves the $5 music and $20 episode caps across restarts and avoids simultaneous writers in one local filesystem. See `tests/local-store.test.mjs`.

This is a **development-only** durable prototype. It is not cloud storage, multi-device synchronization, a user login system, a crash-recoverable distributed job queue, or a reliable cross-host transaction system. Stale lock files after crashes require operator intervention. A provider may charge even if a job fails; never release a reservation until actual charges are reconciled. The prototype's `stopJob` is for simulated/local jobs only, **not** an authorization to discard real charges. Do not connect paid providers until transactional server-side storage, verified billing reconciliation, and authentication are implemented. The store currently does not persist full storyboards or Visual Bibles; those remain browser-local.

Example:

```js
import {LocalStudioStore} from './lib/local-store.mjs';
const store = new LocalStudioStore('./private-data');
await store.createProject({id:'my-series',title:'My series'});
await store.createProduction({id:'episode-1',projectId:'my-series',kind:'episode'});
await store.queueJob({id:'job-1',productionId:'episode-1',estimatedCents:300});
```

Keep `private-data/` out of source control. Never deploy this prototype publicly.

## Phase 9 — Owner-only cloud foundation (not deployed)

`supabase/phase9-schema.sql` defines an owner allowlist, private project/production/asset records, row-level security, and a private media bucket. `lib/cloud/owner-access.mjs` provides a fail-closed owner gate, project creation helper, budget defaults, and validated private storage paths. `tests/cloud-owner.test.mjs` tests the helper logic. This is a **schema and helper prototype**: there is no configured Supabase project, sign-in UI, cloud data migration, or active sync yet.

To enable later: create a dedicated Supabase project, review and apply the SQL using a database administrator, create your Auth user, then manually enroll only that user in `studio_owners`. Install/pin `@supabase/supabase-js` and `@supabase/ssr` with a lockfile, configure server-side cookie authentication, and wire the authenticated client into these helpers. Never expose a service-role key in the browser. Confirm RLS policies with two distinct test users, including attempted cross-project writes, before deployment. The SQL is a starting point and has not been run against a real database. Paid generation must remain disabled until atomic spending reservations and actual charge reconciliation are implemented.

## Phase 10 — Cloud UI and authenticated client adapter (not deployed)
- `/login` owner-only password sign-in, no public registration. `/cloud` project listing, creation, production drafts, and private media upload. Existing `/` remains the browser-local prototype.
- `lib/cloud/studio-cloud.mjs` checks Supabase Auth `getUser()` and the `studio_owners` allowlist before each operation; RLS remains the authoritative access control. Private uploads are limited to 100 MB and known media types, with randomized paths.
- Create a **new dedicated** Supabase project and apply/review Phase 9 SQL, then enroll your Auth UUID as a studio owner using the admin SQL editor. Configure `.env.local` from `.env.example`. No existing projects are modified.
- Run `npm install` to install dependencies and generate a lockfile, then `npm run build`, `npm test`; neither npm dependency installation nor Next.js build was possible in the offline coding environment. Verify with an authorized owner and an unauthorized test account before deploying.
- **Security limitations:** The browser-local dashboard remains separate; cloud storyboards and Visual Bibles are not yet connected. Uploaded files require independent content inspection, per-project access checks on download, and production-grade rate limiting before public deployment. Never enable paid generation without atomic database cost reservations.


## Phase 11 — Cloud synchronization (not deployed)
Apply `supabase/phase9-schema.sql` then `supabase/phase11-sync.sql` to a **new dedicated** Supabase project. Enroll the sole owner manually as described in phase9. Set the environment variables in `.env.example` (never put a service key in the browser). The `/cloud` workspace can save Visual Bibles and storyboards with revision checks to avoid accidental overwrite across browser sessions. Phase 11 tests use mocks, not a live database; run live RLS and storage security tests before production use. Paid AI generation remains disabled.

## Phase 12 — Visual production editor

The cloud workspace now has structured Visual Bible forms for character and location cards, visual style and palette, plus storyboard scene cards with duration, location/character assignments, approval, reordering, and deletion. These changes are saved only when the user presses the respective Save button; the existing cloud optimistic concurrency revision check remains in place. Reordering uses accessible up/down buttons (not drag-and-drop). Scene changes reset approval; edits to the Visual Bible do not automatically invalidate existing scene approvals. No live cloud connection or full Next.js build was verified. Phase 12 adds five pure-logic tests.

## Phase 13 — Director storyboard drafting

The `/cloud` production workspace now includes an offline, rule-based Director panel. It converts a script/concept into a previewable shot sequence, assigns existing project character/location references, and totals exactly 180 seconds for music videos or 420 seconds for episodes. Applying a draft replaces the current in-memory storyboard; save it separately using **Save storyboard**. This is **not** a connected AI model or media generator. Every drafted shot starts unapproved.

## Phase 14 — structured episode and music planning

- `lib/episode-planner.mjs` parses action, `Character: dialogue`, and `[Voiceover] narration` lines, assigns shot objectives, camera suggestions, music sections, project Visual Bible references, and precise 180/420-second runtime budgets.
- The Director UI has a **Structured episode/music planning** toggle. Drafts remain unapproved, must be explicitly applied, then saved.
- Unknown dialogue speakers are flagged for review; there is no AI text generation, voice synthesis, audio analysis, or video generation in this phase.
- This is an offline rule-based planning prototype, not a deployed service.

## Phase 15 — Voice casting and dialogue timing

The Director preview now displays offline dialogue/narration cue timing, estimated speech durations, cast-to-voice matching, and warnings for missing voice IDs or dialogue longer than its scene. `lib/voice-timing.mjs` is a deterministic planning module; it does not generate speech or connect to a voice API. Voice IDs can be added to character entries in the Visual Bible data when a provider is configured. A narrator requires an explicit Narrator character entry to pass the assignment check. Estimates are not actual synthesized durations; generated audio will need a second timing validation before rendering.


## Phase 16 — Offline audio production orchestration

`lib/audio-production.mjs` provides a typed-by-convention audio cue/job planner for dialogue, narration, music, and sound effects. It requires approval in approval mode, verified maximum-cost provider quotes for paid synthesis, voice assignments, and timeline validity. `checkAudioBudget` checks the overall $5 music-video / $20 episode caps. The proposed $2.40 episode audio allocation is a **warning threshold**, not an additional automatic hard cap; changing allocations requires explicit approval. `buildAudioMixManifest` only accepts verified audio asset metadata and produces a safe track manifest with default gain suggestions.

**No voice API, paid generation, FFmpeg audio mixer, or live database spending reservation is connected.** Never use the budget check as the sole payment guard: implement atomic database reservation and reconciliation on the server before enabling paid jobs. Verify ownership of uploaded audio and music rights. Test locally with `npm test`. The full Next.js build remains unverified.

## Phase 17 — Executable local audio mixing

`lib/audio-mixer.mjs` accepts the Phase 16 mix manifest and a **trusted server-side mapping** from asset IDs to local files. It validates audio timing, format and gain; generates FFmpeg filter graphs for delayed voice/narration, sound effects and background music; and executes and verifies an audio WAV/M4A export. The result can be supplied as the `audioPath` in the existing video render plan. Source audio and publishing rights must be verified by the owner. No provider API calls or paid voice synthesis are included.

This is a local runner, not a browser or Cloudflare Worker implementation. Deployment needs a trusted FFmpeg-capable compute environment, private media storage integration, and atomic server-side budget reservations before paid providers are enabled.


## Phase 18 — Final audio/video assembly

`lib/final-assembly.mjs` integrates the local FFmpeg audio mixer and video renderer. It validates matching runtimes and output paths, renders the audio mix, embeds it in the video, and verifies that the final MP4 has both streams. The small end-to-end integration test creates synthetic video and audio and checks the resulting export. No paid AI provider is connected. Full Next.js build and seven-minute production performance remain unverified.

## Phase 19 — Workflow automation state machine

`lib/workflow-automation.mjs` adds a deterministic, testable workflow for automatic and approval-based production. Approval mode pauses at storyboard, generated-assets, and export checkpoints. Both modes require verified assets and a verified export. It supports version checks, event history, job reservations, reconciliation, and the $5/$20 hard caps. Tests: `tests/workflow-automation.test.mjs`.

**This is offline orchestration logic only.** It does not run a durable worker, schedule jobs, call AI providers, connect to a live Supabase database, or expose a working production automation UI. Before paid generation, implement transactional reservations and a durable outbox with idempotency keys in the server database; the in-memory version guard alone is insufficient for concurrent paid requests. No paid provider calls are made.

## Phase 20 — Production monitor

Open `/production` to see a chic, read-only production dashboard with project and status filters, pending approvals, failures, completed exports, and production-level spending bars. The initial rows are explicitly labeled **demonstration data**. You can paste a JSON array of workflow records to inspect them locally; nothing is saved to the server or submitted to providers. The pure monitoring model lives in `lib/production-monitor.mjs` with tests in `tests/production-monitor.test.mjs`. Live authenticated workflow persistence, polling, actions, and download links remain future work. Never treat the preview as a real job queue.


## Phase 21 — Local durable worker claims and crash recovery

`LocalStudioStore.claimNextJob()` atomically claims a queued job under the existing filesystem lock, with worker ID and lease. `heartbeatJob()` renews a live lease; `quarantineExpiredJobs()` moves abandoned running jobs to `needs_reconciliation` **without releasing their reserved money**; `reconcileJob()` requires confirmed provider charges before releasing reservations. This prevents accidental replay of potentially billable requests. The production cap remains $5 for music videos and $20 for episodes.

**Limitations:** this is single-machine filesystem persistence, not a distributed queue, and does not yet run provider jobs. A real deployment needs a transactional database-backed queue, idempotency keys supported by providers, secure worker authentication, and charge reconciliation. The existing `completeJob` and `stopJob` legacy methods are not worker-authenticated; do not expose them as public endpoints. No paid APIs are enabled.

## Phase 22 — Draft transactional cloud queue (NOT DEPLOYED)

`supabase/phase22-queue.sql` defines an owner-readable, client-write-protected paid-job table and **server-only** `studio_internal` SQL functions for atomic reservations, idempotent job creation, claim-with-`SKIP LOCKED`, worker heartbeats, expired-lease quarantine, and verified charge reconciliation. It retains the existing 500-cent music-video and 2000-cent episode caps from `studio_productions.budget_cents`. All unconfirmed provider jobs retain their maximum reserved cost. Failed jobs must be reconciled before releasing money. There is deliberately no live worker or AI provider connection.

**Deployment warning:** This is a reviewable SQL draft and static test suite, not a verified migration. Do not apply to Scentmarked or Atlas. Create a dedicated Vision Studio Supabase project; apply the Phase 9 and 11 SQL first, then review this SQL with a database administrator. `studio_internal` is deliberately not in Supabase's exposed API schemas; its functions must be called by a trusted server-side database connection (or an explicitly designed restricted server bridge), not directly from a browser Supabase RPC. Keep `service_role` exclusively on the server. Do not enable paid generation until live concurrent-transaction, RLS, worker-crash, provider-idempotency, and charge-reconciliation integration tests pass. Static tests do **not** verify PostgreSQL syntax or RLS behavior. For a production migration, generate a timestamped migration with `supabase migration new` using the CLI; the phase file is an offline draft.

## Phase 23 — Cloud worker integration (server-only adapter)

`lib/cloud/worker-runner.mjs` implements fail-closed claim, heartbeat, quarantine, and one-shot polling orchestration for the Phase 22 SQL functions. It accepts an injected **server-only** `callInternal(functionName, args)` transport. **No production transport, scheduler, provider integration, or Supabase deployment is configured.** Internal SQL functions live in an unexposed schema: do not attempt browser-side RPC or expose a service-role key. A server transport must use a narrowly privileged database connection capable of invoking these functions; standard PostgREST RPC cannot call functions in an unexposed schema. Jobs are intentionally claimed but not dispatched to billable services until provider idempotency and independent charge reconciliation are implemented. A claimed job without provider dispatch must be quarantined after lease expiry and reviewed before retry.

Tests: `npm test`. The complete Next.js build and live PostgreSQL integration remain unverified.

## Phase 24 — Provider quote and charge reconciliation foundation

`lib/cloud/provider-reconciliation.mjs` adds validated USD-cent quotes, approval and matching-reservation gates, an idempotent-provider adapter contract, receipt verification, and a single server-side settlement RPC interface. Unverified or over-reservation charges are quarantined rather than automatically retried. Tests use fake providers and database transports.

**Not yet live:** No paid provider API, current pricing feed, or database settlement function has been configured or verified. `settle_provider_charge` is a required server-side transactional RPC contract, not a deployed database function. Provider receipts must be verified independently by a trusted server-side adapter; never accept `verified: true` from a browser. Do not enable paid calls until those safeguards have been implemented and tested against the real provider and database.

## Phase 25 — Secure provider connection contracts (NOT LIVE)

`lib/cloud/provider-connections.mjs` defines an allowlisted server-environment credential interface for image, video, and voice adapters. The `testProviderConnection` contract requires an adapter with documented idempotency support and a **read-only** `checkConnection` method. Connection results and error handling are deliberately sanitized: no keys, raw provider error messages, or request payloads are returned. Probes have a bounded timeout and never call `submit`. Tests use injected fake adapters and fake environment values.

**Security/deployment limits:** This is not a credential vault or real provider integration. The `server` argument is a testable guard, **not an authentication boundary**; import this module only in trusted server code, never in a browser bundle. Configure secrets only in the server's secret manager, and implement provider-specific read-only verification endpoints and documented idempotent submissions before use. Avoid logging request headers, provider responses, or credentials. The checkConnection adapter must respect AbortSignal; timeout cannot forcibly stop a noncooperative external operation. Live prices, provider APIs, PostgreSQL settlement, cloud deployment, and full Next.js build remain unverified. Do not enable paid requests.

## Phase 26 — Provider adapter contracts (offline)

`lib/cloud/provider-adapters.mjs` provides server-only image, video, and voice adapter wrappers using injected provider transports. It validates capability-specific requests, enforces idempotent submission, requires Phase 24 quote/approval/reservation authorization, and exposes safe asynchronous job-status polling. Provider errors are redacted, and uncertain submissions are quarantined instead of blindly retried. Tests use simulated transports. **No real provider SDK, API endpoint, billing, database transaction, or deployed worker is connected.** A committed database reservation and real provider price verification remain prerequisites for any paid call. Provider output URLs require additional host allowlisting and secure asset ingestion before production use.

## Phase 27 — Verified asset registry (offline)

`lib/cloud/asset-registry.mjs` adds SHA-256 byte verification, allowlisted media MIME types, per-type size caps, project-scoped storage keys, duplicate asset rejection, project-isolated reuse by content digest, verified-only scene attachments, and storage usage summaries. Tests: `tests/asset-registry.test.mjs`.

**Not a live asset storage service:** MIME type is declared metadata, not magic-byte content inspection. Before deployment, use trusted media decoders/ffprobe, malware scanning as appropriate, private object storage, authenticated authorization and signed short-lived retrieval, immutable storage writes, and transactional metadata persistence. Never trust browser-supplied `verified` flags. No provider URLs are fetched; no external AI or storage APIs are connected. Existing spending caps and approval requirements are unchanged.

## Phase 28 — Character and scene continuity contracts (offline)

`lib/continuity-engine.mjs` adds an immutable per-production continuity ledger with canonical character appearances, wardrobe, voices, locations, project style, reference asset IDs, scene briefs, drift audits, and revision-checked approval. Updating a character identity invalidates approvals for affected scenes. Wardrobe/style overrides are flagged for explicit review rather than silently accepted. Tests: `tests/continuity-engine.test.mjs`.

**Limitations:** This is deterministic metadata consistency, **not** AI visual inspection or proof that generated frames depict the same person. Reference asset IDs are not independently verified here; production must validate them against Phase 27's trusted asset registry. No paid generation, cloud storage, or real AI service is connected.

## Phase 29 — Visual continuity review gate (offline)

`lib/visual-review.mjs` implements a **human evidence review** for generated scene assets. It requires an approved continuity scene, verified same-production generated and reference assets, records human match/mismatch/uncertain findings, blocks rendering on mismatch/uncertainty or missing required checks, and invalidates reviews when the continuity ledger changes. The `canRenderReviewedScene` guard can be integrated into a future render submission path; it is **not yet wired to every render entry point**. Tests: `tests/visual-review.test.mjs`.

**Not visual AI:** This phase does not inspect pixels, run computer vision, compare faces, or certify image identity. `verified` metadata must come from a trusted server-side asset registry; do not trust browser flags. Automated image analysis will require a separate vetted model/decoder integration and evidence provenance. No live providers, cloud services, or paid calls were connected.

## Phase 30 — Model-assisted visual inspection interface (offline)

`lib/visual-inspection.mjs` adds `prepareVisualInspection`, `inspectVisuals`, and `confirmInspection`. It requires Phase 29 continuity-approved scenes and verified same-production assets, re-resolves trusted assets before calling an injected vision-model adapter, validates structured model findings, and routes all outcomes to explicit human review. A model's `match` verdict never grants render approval. Human decisions are recorded through the Phase 29 review gate, including revision checks and mismatch blocking. Tests: `tests/visual-inspection.test.mjs`.

**Not live image recognition:** No vision model, provider API, image decoder, or cloud asset storage is connected. The injected adapter must use authenticated, authorized, private asset reads; enforce timeouts, rate limits, and price reservations; sanitize model outputs; and validate reference image licensing. No paid generation or inspection occurred. This phase does not wire the review gate to every render path. The full Next.js build remains unverified.

## Phase 31 — Visual inspection dashboard (offline preview)

`app/inspection/page.tsx` adds a responsive plum/gold review workspace at `/inspection`, showing a generated scene beside reference previews, advisory model findings, scene/project filters, and a human review worksheet. `lib/inspection-dashboard.mjs` validates imported JSON, limits records, rejects external image URLs and SVG, and accepts only bounded embedded raster data URLs. `tests/inspection-dashboard.test.mjs` covers the preview validation and summaries.

**Security and operational limits:** The page is a client-only, non-persistent demonstration/import viewer. Its reviewer worksheet does not grant trusted approval, invoke `confirmInspection`, modify production state, or unblock rendering. Imported JSON is untrusted; embedded data image formats are syntactically checked, not decoded or authenticated. Before live use, implement server-authenticated project access, trusted signed asset retrieval, server-side human approval and revision checks, and enforcement of `canRenderReviewedScene` at every render submission path. No vision model or paid generation is connected. Full Next.js build is unverified.

## Phase 32 — Secure review approval and render authorization contracts (offline)

`lib/secure-review-approvals.mjs` implements `approveVisualReview` and `authorizeReviewedRender` as server-side orchestration contracts. The caller must authenticate the actor, load authoritative records, authorize access to the specific project/production, and persist reviews using compare-and-swap. Rendering requires a current approved visual review and verified same-production asset, then calls an atomic enqueue contract that **must recheck** revisions, permissions, and asset validity within the database transaction. Tests: `tests/secure-review-approvals.test.mjs`.

**Not deployed or wired to all render routes:** Store methods are injected test doubles, not a live authenticated database or transactional implementation. No client worksheet action can authorize production yet. The existing render endpoints must be audited and integrated before claiming universal enforcement. No paid generation or cloud deployment was performed.

## Phase 33 — Trusted render execution boundary

`lib/approved-render-runner.mjs` adds `executeApprovedRender` for a **local server worker**. It validates an audio/video assembly plan, claims a job through a trusted injected store, checks the latest persisted review, continuity ledger and verified asset, and requires `confirmRenderAuthorization` before running the local FFmpeg final assembly. Completion/failure is reported using the lease token. No paid provider calls are made.

**Deployment requirement:** The store's `claimApprovedRender` and `confirmRenderAuthorization` must be implemented as atomic database operations checking owner authorization, lease ownership, current review and ledger revisions, and asset verification. This phase does not implement those database transactions, prove end-to-end render authorization across every entry point, or deploy cloud workers. Do not expose this runner directly to browser-provided review records.

## Phase 34 — Render database enforcement (draft)

`supabase/phase34-render-authorization.sql` defines private, service-only SQL functions for review approval, idempotent render enqueue, row-locked worker claiming, lease-token confirmation, and continuity invalidation. Run `npm test` for structural contract checks. **Not deployed or integration-tested against PostgreSQL.**

Before any production use: implement complete trusted human findings persistence, verify asset bytes/checksum in a trusted storage registry (the existing `studio_assets` table alone does not establish verification), add lease-safe completion/failure RPCs, test transaction concurrency and RLS in a disposable PostgreSQL database, and ensure every render entry point uses these gates. A worker that has already begun rendering cannot be forcibly stopped by SQL alone; recheck authorization at completion and use cancellation signals where possible. Do not apply to an existing Scentmarked/Atlas project.

## Phase 35 — PostgreSQL integration readiness gate

`npm run test:postgres:readiness` checks whether the PostgreSQL client, a **disposable dedicated** database connection variable (`VISION_TEST_DATABASE_URL`), and the required Phase 34 functions are present. It is read-only and does **not** apply SQL or run transactional concurrency tests. Exit code 2 means integration verification is blocked. Unit tests cover readiness failure modes.

**Unverified and blocked:** No disposable PostgreSQL service was available in the development runtime. Do not apply Phase 34 to a production database. Before deploying, set up an isolated test database, install the Phase 9/11/22/34 schemas with the necessary Supabase roles/extensions, run concurrent claims/approval invalidation and RLS authorization tests, and review the Phase 34 design gaps (trusted human findings, verified asset provenance, worker completion and lease recovery). The `VISION_TEST_DATABASE_URL` is a local test-only secret; never commit it. A green Node unit suite is not evidence that PostgreSQL transactions work.

## Phase 36 — opt-in PostgreSQL transaction test harness

This phase fixes a stale-read race in Phase 34 approval/enqueue RPCs by re-reading the review after locking the production revision. It adds `supabase/phase36-transaction-tests.sql` and a guarded `npm run test:postgres:transactions` runner. The SQL verifies rejection of unapproved/stale renders, actor/token checks, idempotent enqueue, sequential worker claims, and revocation; it uses `BEGIN`/`ROLLBACK` and needs a **dedicated disposable Supabase test database**, one enrolled test owner, and phases 9/11/22/34 already installed. The script does **not** simulate simultaneous PostgreSQL sessions: true concurrent claim/approval testing remains pending. No production database should be used. Explicitly set `VISION_DISPOSABLE_DATABASE=YES` and `VISION_TEST_DATABASE_URL` only after confirming isolation. The environment must have `psql` installed. Do not copy live production credentials into test environments. The runner is opt-in and will not run during `npm test`.

Phase 36 does not enable paid generation, deploy a cloud worker, or establish live database verification.

## Phase 37 — Trusted production dashboard feed (offline contract)

`lib/cloud/trusted-production-feed.mjs` provides `loadTrustedProductionFeed` for **trusted server-side use only**. It checks authenticated owner identity, validates project/status/limit filters, rejects cross-owner or cross-project store results, validates workflow budgets using the existing monitor, and returns a bounded read-only projection with summary counts. Tests use a simulated store (`tests/trusted-production-feed.test.mjs`). The existing `/production` page **still displays demonstration/imported records**, not live database data.

**Deployment blocker:** The injected `listOwnerWorkflows` store must implement owner checks within PostgreSQL/RLS, with server-side session validation and bounded queries; this module is defense in depth, not an authentication boundary. Do not expose its `actor` or `ownerId` parameters as trusted browser input. Phase 36 PostgreSQL integration and true concurrent transaction tests are still pending. No database was modified, no provider connected, and no paid requests submitted.

## Phase 38 — Read-only disposable database schema preflight

Adds `npm run test:postgres:schema` to inspect the `studio_internal` PostgreSQL function catalog using a **read-only query**. It requires `VISION_DISPOSABLE_DATABASE=YES`, `VISION_TEST_DATABASE_URL`, and `psql`. It refuses to report success when any of the five expected render authorization functions are missing. The command does not migrate, mutate, or deploy a database. It checks function names, **not** signatures, behavior, permissions, or concurrency correctness. Run `npm run test:postgres:transactions` separately in a dedicated disposable test environment after the schema is installed. Do not use credentials for any production database. Tests: `tests/postgres-schema-preflight.test.mjs`.

**Still blocked:** No disposable PostgreSQL instance or client is configured here, so actual transaction/concurrency verification, production dashboard database integration, and deployment remain unverified. No paid provider requests are made.

## Phase 39 — Concurrency lock-order correction

Fixes a potential PostgreSQL deadlock between `confirm_render_authorization` and `invalidate_render_approvals`: both now lock the production revision before the render job. The confirmation RPC re-reads the job after acquiring the locks and checks the lease using `clock_timestamp()` rather than a transaction-start timestamp. Added four structural regression tests. **This is not a substitute for concurrent two-session PostgreSQL tests.** The disposable database and psql client are still unavailable in this environment; no schema was deployed and no live database was modified. Before deployment, execute real two-session concurrency tests and audit all RPC lock orders, worker lease completion and RLS.

## Phase 40 — Read-only PostgreSQL function security audit

`npm run test:postgres:security` verifies **exact** Phase 34 function signatures, SECURITY DEFINER with an empty search path, denied execution for PUBLIC/anon/authenticated, and permitted service_role execution. It is read-only and refuses to run without `VISION_DISPOSABLE_DATABASE=YES`, a designated `VISION_TEST_DATABASE_URL`, and `psql`. It does not install migrations or test concurrent transactions. Five offline tests exercise its fail-closed behavior. Do not point it at a production database; do not use existing Scentmarked/Atlas credentials. PostgreSQL integration and simultaneous-session testing remain pending.

## Phase 41 — Explicit disposable database target verification

The PostgreSQL transaction runner now requires **three independent acknowledgements** before it can connect: `VISION_DISPOSABLE_DATABASE=YES`, an exact `VISION_TEST_DATABASE_HOST`, and an exact `VISION_TEST_DATABASE_NAME` that includes `test`, `disposable`, `scratch`, or `ci`. This reduces the risk of accidentally running rollback-based integration checks against a production database. Set `VISION_TEST_DATABASE_URL` only in the local test environment, never in source control. Example database name: `vision_ci_test`.

Run `npm run test:postgres:transactions` only after creating and migrating a separate disposable database. The existing SQL harness is not a substitute for simultaneous-session concurrency tests; those remain pending. The validator does not prove a database is disposable, so independently verify its ownership and isolation. No production database changes or provider calls are part of Phase 41.

## Phase 42 — PostgreSQL environment preflight

`npm run test:postgres:environment` performs an **offline-only** readiness check for `psql`, optional Docker, and the existing explicit disposable-database acknowledgements. It does not start containers, install PostgreSQL, connect to any database, migrate schemas, or claim concurrency verification. An exit code of 2 means blocked. Four new Node tests cover missing clients, missing target acknowledgement, and Docker-optional behavior.

To move beyond readiness, provision a **separate** disposable Supabase-compatible PostgreSQL test environment (with auth schemas/roles and phases 9/11/22/34 applied), independently verify isolation, and run the guarded transaction and security checks. Two-session concurrency tests are still necessary. Never use an existing Scentmarked/Atlas database or production credentials. The $5 music-video and $20 episode hard caps remain unchanged.

## Phase 43 — Claim/approval lock-order correction

Fixed a lock-order deadlock risk: the render job claim RPC previously locked a job before the production revision, while confirmation/invalidation locked the revision first. `claim_approved_render` now locks the production revision with `SKIP LOCKED`, then rechecks and locks an eligible job. It may temporarily skip busy productions; workers should poll again. Four new offline regression tests cover lock order, eligibility revalidation, input limits and leases. **Not PostgreSQL-verified**; a dedicated disposable Supabase-compatible database and true two-session concurrency tests are still required before deployment. No existing database changed.

## Phase 44 — Two-worker PostgreSQL smoke-test harness

Added `scripts/check-postgres-two-worker.mjs`, a two-session advisory-lock smoke test. It uses two independent PostgreSQL client processes to check that a competing session cannot acquire a transaction-scoped lock while the first session holds it. It requires `VISION_DISPOSABLE_DATABASE=YES`, an explicitly acknowledged test database hostname/name, and `VISION_ENABLE_TWO_WORKER_TEST=YES`. Run with `node scripts/check-postgres-two-worker.mjs` only against a dedicated disposable database.

**Scope:** This checks PostgreSQL cross-session locking only. It does **not** exercise actual `claim_approved_render` or `invalidate_render_approvals` simultaneously. Those application-specific concurrency tests remain pending. No database or provider connections are made by `npm test`.

## Phase 45 — deterministic two-session lock smoke test

The PostgreSQL two-worker smoke test now waits for worker A to explicitly print
`LOCK_HELD` after obtaining its advisory transaction lock before worker B tries
its competing lock. This removes the prior arbitrary 900 ms startup delay. The
smoke test is **not** a substitute for render-claim, approval-invalidation, or
budget-reservation concurrency integration tests. It requires `psql`, an
explicitly authorized disposable PostgreSQL target, and
`VISION_ENABLE_TWO_WORKER_TEST=YES`. No production database should be used.

## Phase 46 — Parameterized trusted production-feed database adapter

`lib/cloud/production-feed-store.mjs` adds a **server-only** read-only query adapter to `loadTrustedProductionFeed`. It parameterizes owner, optional project, and limit, maps only explicitly selected columns, and rejects malformed or oversized results. Five offline tests cover parameterization, input rejection, output redaction, integration, and cross-owner leakage.

**Not live:** `studio_production_feed` is an **expected future security-invoker view**, not an installed or verified database object. Before connecting it, create and audit the view against actual schema, enforce RLS on underlying tables, restrict DB grants, derive the owner from verified server auth (never browser input), and execute PostgreSQL concurrency and authorization tests. The injected query executor must use server-side credentials with least privilege. Do not expose the adapter to client bundles. No paid generation or cloud database changes were performed.

## Phase 47 — Trusted production feed schema (SQL draft)

`supabase/phase47-production-feed.sql` adds a tightly scoped workflow snapshot table and a `security_invoker` view matching the Phase 46 read adapter. It enables owner-scoped RLS, removes browser write privileges, checks project/owner/production consistency and the $5/$20 snapshot budget caps. This is a **read model only**: no server writer or synchronization is installed; existing productions will not appear until trusted snapshots are populated. Snapshot caps are not a substitute for the transactional paid-job ledger. Four offline structural tests were added. The SQL has **not** been executed in PostgreSQL; RLS, permissions, transactional writer, and concurrency need live isolated testing. Do not apply to Scentmarked/Atlas or any production database.

## Phase 48 — Trusted workflow snapshot synchronization

Added `lib/cloud/workflow-snapshot-sync.mjs` and corresponding regression tests.
The server-only writer validates owner identity, UUIDs, workflow status, mode conversion (`automatic` -> `auto`), and the $5/$20 hard caps. Within an injected database transaction it locks the production ownership row and uses a version-checked update or conflict-safe initial insert. Failed ownership, duplicate inserts, or stale updates fail closed. The injected transaction must roll back on exceptions; a production service must supply authenticated server identity and a database role with tightly scoped permissions. This is a snapshot projection only: it does not reserve provider charges or authorize rendering.

**Not deployed or integration-tested:** No PostgreSQL transaction executor or live database was configured; SQL security and transaction behavior require disposable PostgreSQL verification. Do not expose this writer to browsers or use a service-role key client-side.

## Phase 49 — Authenticated read-only production dashboard connection

The `/production` dashboard now starts empty, not with fake live jobs. The **Refresh trusted feed** control calls `/api/production-feed`, which validates the Supabase session server-side with `auth.getUser()` and reads the security-invoker `studio_production_feed` view using the user's session (not a service-role credential). Errors and unconfigured environments are shown explicitly. Imported JSON and demo records remain local, clearly distinguished from trusted records.

**Deployment blockers:** Phase 47 SQL has not been executed or verified in PostgreSQL, the workflow snapshot writer is not connected to a trusted transaction executor, session-cookie refresh middleware is required for production auth, and this endpoint has not been end-to-end tested. This endpoint is strictly read-only; it does not submit jobs or spend money. Budget limits remain $5 music / $20 episode.

## Phase 50 — End-to-end integration contract tests

Added `tests/production-integration.test.mjs`, exercising the real workflow snapshot writer, trusted production feed store, and monitoring feed together with an **in-memory transactional SQL double**. Covers creation, revision updates and budget display, stale-update rejection, owner authorization, and project filtering. These are integration *contract* tests, **not PostgreSQL transaction tests**. The SQL double does not simulate concurrent PostgreSQL locking, row-level security, or commit behavior under real database faults. No cloud resources or provider APIs were contacted.

Run `npm test`. Actual PostgreSQL verification, full Next.js build, and live deployment remain outstanding.

## Phase 51 — application build verification

Added `npm run check:build` and `npm run verify:build`. The checker verifies core Next.js files and installed dependencies, and refuses to report a successful build unless `npm run build` exits successfully. Four regression tests cover missing files, missing dependencies, blocked execution, and build exit status.

**Verification on 2026-11-10:** 293/293 Node tests passed. `npm install --offline` failed because required packages were not cached; an online install failed because the npm registry could not be resolved (`EAI_AGAIN`). The full Next.js build was therefore **not run or verified**. On a network-enabled development machine run `npm install`, `npm run verify:build`, and `npm test`. No cloud database was modified and no paid AI generation occurred.

## Phase 52 — secure production feed query boundary and compilation blocker

`lib/cloud/production-feed-request.mjs` now validates the dashboard's URL filters before querying the database and maps the **validated store parameter list** into the authenticated Supabase query. This fixes a mismatch in the previous route, where its query closure ignored the store's project and limit parameters and instead read directly from raw URL parameters. It rejects duplicate/unknown parameters, malformed limits, and malformed project/status filters. The read-only route remains authenticated and uses the caller's JWT, not a service-role key. Five new tests cover request parsing and query construction; the existing route contract test was updated to inspect the extracted module.

**Build status:** An attempted `npm install` failed with `EAI_AGAIN` resolving registry.npmjs.org, so a full Next.js build remains blocked and unverified. Run `npm install && npm run verify:build && npm test` on a network-enabled development machine. No live database, paid AI provider, or deployment was touched.

## Phase 53 — Dependency-free offline interface preview

When npm registry access is unavailable, run `npm run preview:offline` and open `http://127.0.0.1:4173` on the same computer. This is a **standalone HTML design preview**, not the full Next.js app. It demonstrates the plum/gold dashboard, project draft creation/deletion, workflow-mode selection, and budget labels using browser-local storage. It never contacts a cloud database or paid AI provider. It is intentionally bound to localhost, with a restrictive content-security policy. Do not expose it to the public internet or treat it as secure cloud storage. The complete Next.js build still requires `npm install` and `npm run verify:build` in a network-enabled environment. Four offline preview server tests were added.

## Phase 54 — Offline preview backup and restore

The dependency-free preview now supports downloading a versioned JSON backup of local project drafts and importing it after explicit confirmation. Imports replace existing browser-local drafts, validate IDs/types/names, reject duplicates and files larger than 500 KB, and ignore untrusted extra fields. The backup file remains on the user’s device; the localhost server exposes no upload route or external API. These are preview-only planning drafts, not production assets, approvals, or secure cloud backups.

**Full application build remains blocked:** the npm registry is still unreachable (`EAI_AGAIN` on 2026-11-10). The Next.js application has not been compiled or deployed. Run `npm install && npm run verify:build` in a network-enabled environment.

## Phase 55 — Offline preview project editing
Added dependency-free local project rename and planning-mode controls, backed by immutable validation helpers. Project type cannot be changed by editing because it determines budget/duration. These controls only edit browser drafts: changing a planning label never grants generation approval. Added tests for isolation, invalid edits and serving the editor module. Run `npm run preview:offline` to inspect the UI. Full Next.js build and live PostgreSQL verification remain pending.

## Phase 55 — Offline workspace integration and build verification

The offline preview now imports the **existing** `lib/workspace.mjs` and `lib/budget.mjs` through a strict local, read-only allowlist. It supports project-scoped production drafts, scene descriptions, scene approval toggles, and a planning-readiness indicator. The preview stores this local scene data separately from project metadata. **JSON project backups export project metadata only, not scene drafts**; importing a project backup clears existing scene drafts to avoid cross-project data mixing. Preserve a separate copy of browser data if you need to retain scenes before importing. The preview is not a production editor or authorization service and never calls paid generation APIs.

### Master checklist (verified Phase 55)

- [x] Multi-project offline design preview and project metadata backup
- [x] Connect offline preview to existing workspace production/scene/approval domain logic
- [x] Project-scoped local production drafts and planning readiness
- [x] Offline HTTP route allowlist and automated regression tests
- [x] Build prerequisite check (source files found; missing dependencies reported)
- [ ] Install Next.js, React, Supabase, and TypeScript packages in network-enabled environment
- [ ] Successfully compile and run full Next.js application
- [ ] Implement scene-inclusive backups and migration from offline preview to full application
- [ ] Verify actual PostgreSQL RLS, transactions, and concurrency
- [ ] Integrate real AI providers and test generation with hard cost caps
- [ ] Full end-to-end browser, export, security, and staging deployment tests

Run `npm run check:build`, `npm test`, or `npm run preview:offline` in the extracted source folder. The offline preview is available at `http://127.0.0.1:4173` on that computer.

## Phase 56 — Complete offline workspace backups

- Added `preview/workspace-backup.mjs` with a versioned v2 format containing projects, production drafts, storyboard scenes and scene approvals.
- Imports of legacy v1 project-only backups remain supported (no scenes exist in those backups).
- Backup validation rejects orphaned productions, duplicate IDs, malformed scenes, and nonzero spend/reservation data in offline drafts.
- The offline preview now exports v2 and restores projects and productions together; it asks for confirmation before replacing local data and attempts to restore prior storage values on write failure.
- Updated the offline preview server to serve the backup module. Browser module imports use relative paths.
- `npm test`: 323/323 passed. Full Next.js build and real PostgreSQL verification are still pending; no cloud or paid generation was used.

### Master checklist update (Phase 56)

- [x] Multiple separate local projects and workflow modes
- [x] Offline production drafts, scenes, and local approval controls
- [x] Full offline workspace JSON export and validated import (v2)
- [x] Backward-compatible project-only backup import (v1)
- [x] Offline preview regression tests (323 passing in total)
- [ ] Full Next.js dependency installation and successful build
- [ ] Browser-level backup/restore interaction tests
- [ ] Safe PostgreSQL transaction, RLS, and concurrency verification
- [ ] Real provider integration, cost reconciliation, and end-to-end rendering
- [ ] Cloud deployment and final acceptance testing

## Phase 57 — Browser test harness and verification status

- Added `browser-tests/test_preview.py` using Python Playwright and Chromium. It exercises project creation, production draft, scene approval, JSON backup export/import, and persistence across page reloads.
- Run with `python browser-tests/test_preview.py` after installing Playwright and Chromium. It launches a local preview server on port 4187 and terminates it afterward.
- The browser smoke test **did not pass in this execution environment**: Chromium navigated to `chrome-error://chromewebdata/` rather than the preview server, although `curl` reached the local preview successfully. The harness is included for a network-enabled local environment; its steps are not counted as passing tests.
- `npm test`: **323/323 passing**. Full Next.js build still blocked by missing npm dependencies.

### Updated master checklist (Phase 57)
- [x] Multiple independent local projects and scene planning
- [x] Offline backup/restore of projects, productions, scenes, approvals
- [x] Browser smoke-test script authored
- [x] Node automated suite: 323 tests passing
- [ ] Browser smoke test passing in an environment where Chromium can reach localhost
- [ ] Full Next.js dependency installation and successful compilation
- [ ] Real PostgreSQL integration/concurrency tests
- [ ] Live AI generation, complete exports, and deployment

## Phase 58 — Preview HTTP integration and browser diagnostics

- Added `tests/preview-http-integration.test.mjs`: four tests exercise a real ephemeral local HTTP server, the offline UI and production module routes, security headers, and rejection of unauthorized HTTP methods and private paths.
- Updated `browser-tests/test_preview.py` to verify the server is ready using direct HTTP before launching Chromium and to fail immediately with an actionable explanation when the browser is blocked by administrative policy.
- `npm test`: **327/327 passed** (four more than Phase 57).
- **Not verified:** Chromium UI interactions (browser navigation returns `net::ERR_BLOCKED_BY_ADMINISTRATOR` in this environment); full Next.js compilation (npm dependencies unavailable); live PostgreSQL and AI providers.

### Phase 58 master checklist

| Item | State |
| --- | --- |
| Local multi-project dashboard, scenes and approval controls | Implemented locally |
| Complete JSON backup and restore | Implemented locally |
| Offline preview HTTP integration tests | Complete (4 tests) |
| Automated Node tests | 327 passed |
| Chromium browser interaction test | Script prepared; blocked by browser policy |
| Full Next.js build | Pending dependencies and compilation |
| Live PostgreSQL authorization/concurrency tests | Pending |
| Real AI video generation and provider cost enforcement | Pending |
| Staging and production deployment | Pending |

### Next priority

Run `python browser-tests/test_preview.py` on a development machine where Chromium can navigate to localhost, install npm dependencies, then run `npm run verify:build`. Fix any browser or compilation errors before integrating live providers.

## Phase 59 — Canonical source tree and build readiness

- Removed an accidentally embedded `vision-studio-phase54-src` copy from the distribution. The top-level directory is the only canonical application source tree.
- Added `npm run check:source` to detect missing entrypoints, nested legacy copies and malformed TypeScript configuration.
- Added three regression tests; **330/330 Node tests pass**.
- `npm run check:build` reports missing Next.js, React, Supabase, Lucide and TypeScript packages. **A full Next.js compilation has not passed**. No database or paid AI provider was used.

### Master checklist (Phase 59)

| Milestone | Status |
| --- | --- |
| Independent local projects and productions | Implemented locally |
| Storyboards and scene approvals | Implemented locally |
| Full-workspace JSON backup and restore | Implemented locally |
| Offline preview and HTTP tests | Passed locally |
| Single canonical application source tree | Completed Phase 59 |
| Source-tree integrity checker | Completed Phase 59 |
| Automated Node test suite | 330 passed |
| Chromium browser interaction test | Pending; browser environment blocked |
| Install dependencies and compile full Next.js app | Pending |
| Live PostgreSQL and row-level security verification | Pending |
| Live AI video production and budget reconciliation | Pending |
| Cloud deployment | Pending |

Next: install dependencies in a network-enabled development environment, run `npm run verify:build`, fix any compiler errors, then run the browser test against the working preview. The budget ceilings remain $5 per three-minute music video and $20 per seven-minute episode.

## Phase 60 — Offline TypeScript syntax and import verification

- Retried `npm install --ignore-scripts --no-audit --no-fund` and confirmed the registry lookup fails with `EAI_AGAIN`. No complete Next.js build was possible in this environment.
- Added `npm run check:typescript-source`: parses all application TS/TSX files with TypeScript and checks local relative imports without requiring Next.js dependencies. This is **syntax and import-path verification only**, not semantic type checking or a Next.js build.
- Added four regression tests for valid TSX, syntax errors, missing relative imports, and valid relative imports.
- No Supabase database was modified and no AI generation was triggered.

### Master checklist (Phase 60)

| Milestone | Status |
| --- | --- |
| Local project drafts, scenes, approvals and backup | Implemented locally |
| Offline preview HTTP tests | Passed locally |
| Canonical source-tree check | Passed locally |
| Offline TS/TSX syntax and local-import check | Added Phase 60; passed |
| Install application dependencies | Blocked by registry DNS (`EAI_AGAIN`) |
| Full Next.js build and semantic TypeScript check | Pending |
| Browser end-to-end interaction tests | Pending |
| Real PostgreSQL authorization and concurrency | Pending |
| Live AI generation and cost enforcement | Pending |
| Cloud deployment | Pending |

Next: run `npm install` and `npm run verify:build` on a machine with npm registry access, resolve actual compiler errors, then run the browser test. The $5 music-video and $20 episode limits remain unchanged.

## Phase 61 — Application module graph verification

- Added `npm run check:module-graph`, which checks TypeScript/TSX syntax and resolves local static imports, re-exports, literal dynamic imports, and literal CommonJS requires. This complements the Phase 60 source checker.
- Four new regression tests cover the current app, valid dynamic imports/re-exports, missing re-export targets, and missing dynamic import targets.
- `npm test`: **338 passed, 0 failed**. `npm run check:module-graph`: **13 application files checked, no issues**.
- This is **not** semantic TypeScript checking, a Next.js build, or live browser verification. Application dependencies remain unavailable in the current environment; the full build is pending.

### Master checklist (Phase 61)

| Milestone | Status |
| --- | --- |
| Local projects, production drafts, scenes and approvals | Implemented locally |
| Complete local workspace backup and restore | Implemented |
| Offline preview server and HTTP tests | Passed locally |
| Source tree and TypeScript syntax checks | Passed |
| Static application module graph | Passed (13 files) |
| Automated Node tests | 338 passed |
| Install Next.js and application dependencies | Pending |
| Full Next.js build and semantic type checking | Pending |
| Chromium browser interactions | Pending |
| Real PostgreSQL authorization and concurrency | Pending |
| Live AI generation and cost enforcement | Pending |
| Cloud deployment | Pending |

Next: install dependencies in a network-enabled environment, run `npm run verify:build`, and address actual build diagnostics. No paid generation or remote database changes were performed.

## Phase 62 — network-enabled Next.js build verification workflow

Added `.github/workflows/verify-application.yml`, a manual/PR/push GitHub Actions workflow that installs dependencies, runs all Node and source checks, and executes the **actual** `next build`. This is an optional build-validation path if the source is later placed in a GitHub repository. No repository was created or changed and the workflow has **not been executed** on GitHub. It uses read-only repository permissions, has no deploy or paid-generation step, and does not need credentials. The local environment still cannot resolve registry.npmjs.org, so the actual build is not yet verified.

To use: put the complete project at the root of a private GitHub repository, open **Actions → Verify Vision Studio application → Run workflow**, and inspect the `Compile Next.js application` step. A first successful run should be followed by generating and committing a `package-lock.json` for reproducible `npm ci` builds. Avoid uploading private media, API keys, or database dumps.

### Master checklist (Phase 62)
- [x] Offline project, production, storyboard and approval prototype
- [x] Workspace backup and restore
- [x] Node automated tests and static source/module checks
- [x] Network-enabled CI build verification workflow authored and tested locally
- [ ] GitHub workflow actually run on a network-enabled runner
- [ ] Full Next.js application build passes
- [ ] Browser interaction tests pass
- [ ] Real PostgreSQL security and concurrency verified
- [ ] Live AI provider integration, strict cost reconciliation, deployment

## Phase 63 — CI compilation diagnostics and reproducibility

The GitHub Actions application-build workflow now uses `npm ci` when a committed `package-lock.json` exists, and falls back to `npm install` with an explicit warning otherwise. The Next.js compilation captures its output in `vision-build.log` and uploads it as a short-lived workflow artifact even if compilation fails. The shell enables `pipefail` so a failed build cannot be hidden by `tee` succeeding. Two new workflow regression tests pass.

**Verification:** 344 automated Node tests pass, plus local source/module checks. The full Next.js build is still **not verified**: the current environment cannot resolve the npm registry and no Vision Studio GitHub repository/workflow run has been authorized. This phase does not deploy or connect AI providers.

### Master checklist (Phase 63)
- [x] Offline project management, scenes, approvals, workspace backups
- [x] Local Node tests and source/module integrity checks (344 passing)
- [x] GitHub Actions build workflow with failure logs and optional lockfile-safe installation
- [ ] Commit `package-lock.json` from a trusted network-enabled install
- [ ] Run GitHub Actions verification against actual source
- [ ] Fix compilation errors and confirm full Next.js build
- [ ] Complete real browser interaction tests
- [ ] Verify PostgreSQL RLS, transactions, and concurrent workers
- [ ] Integrate paid AI providers with strict spending enforcement and deploy

## Phase 64 — Fix actual TypeScript cloud module declaration errors

Ran the globally available TypeScript compiler (`tsc --noEmit`) without installed app dependencies. It exposed four **real** missing named exports in `lib/cloud/studio-cloud.d.mts`: `loadCloudProject`, `listCloudProductions`, `saveVisualBible`, and `saveStoryboard`, although all four functions exist in `studio-cloud.mjs`. Added those declarations plus the five previously undeclared public helpers. Added `scripts/check-cloud-declarations.mjs` and four regression tests to prevent declaration drift; CI now runs the checker. **348/348 Node tests pass**.

The full Next.js compilation remains blocked: npm registry DNS lookup fails (`EAI_AGAIN`), and Next.js, React, Supabase and their types are not installed. Bare `tsc` reports missing dependency types and many cascading JSX diagnostics, so it is **not** evidence of a complete successful build. No remote GitHub, database, AI provider or deployment changes occurred.

### Master checklist (Phase 64)
- [x] Offline workspace, storyboards, approvals and backups
- [x] Automated Node tests (348 passing)
- [x] Fix missing TypeScript declarations for cloud workspace functions
- [x] Regression checker for JS/TS declaration drift
- [x] CI workflow prepared with declaration check
- [ ] Install dependencies and run actual Next.js build
- [ ] Fix any remaining real compiler diagnostics
- [ ] Browser interaction and PostgreSQL concurrency testing
- [ ] Live AI generation and secure deployment

## Phase 65 — Production feed filter correctness

Fixed a dashboard pagination correctness bug: previously, `status` was filtered only after the database had applied `LIMIT`, so matching workflows could be omitted from results. The trusted feed now forwards status to the store, which includes the filter in its parameterized query; the Supabase adapter applies the filter before ordering and limiting. Added four tests for the combinations of owner, project and status filtering. The application build still requires external dependencies; no live database, cloud services or paid generation were used.

### Master checklist (Phase 65)
- [x] Local project management, scenes, approvals, and backups
- [x] Trusted production feed status filtering before pagination (unit tested)
- [x] Automated Node test suite
- [ ] Full Next.js build with installed dependencies
- [ ] Browser interaction testing
- [ ] Real PostgreSQL RLS and concurrency verification
- [ ] Live AI production and deployment

## Phase 66 — Reset scene approvals when visual identity changes

Added `lib/approval-invalidation.mjs` and connected it to the Next.js Visual Bible editor. When the visual style, palette, character roster or location roster changes, locally approved storyboard scenes belonging to the edited project are reset to `approved: false` for renewed review. Other projects are unchanged. Timestamp-only updates do not invalidate approvals. This is a local workflow safeguard, **not** proof of live generation authorization.

**Verification:** 356/356 Node tests passed; TypeScript source syntax/relative-import check passed for 13 files. Full Next.js compilation and real browser testing remain unverified because required dependencies are unavailable.

### Master checklist (Phase 66)
- [x] Offline projects, production drafts, storyboards, approvals, and backups
- [x] Visual Bible changes reset scene approvals within the correct project
- [x] Automated Node tests (356 passing) and TypeScript source checks
- [ ] Full Next.js build with dependencies installed
- [ ] Real browser interaction tests
- [ ] Live PostgreSQL security and concurrency tests
- [ ] Paid AI provider integration and full-length production
- [ ] Secure staging and production deployment

## Phase 67 — Independent storyboard scene drafts

- Fixed the main Next.js workspace editor so each production owns an independent in-progress storyboard scene input, keyed by production ID. Previously, all production cards shared a single `sceneText` state.
- Added two regression tests in `tests/scene-draft-isolation.test.mjs`.
- Verification: `npm test` **358 passed, 0 failed**; `npm run check:typescript-source` passed for 13 application files.
- Attempted `tsc --noEmit`; full compilation remains blocked by missing Next.js, React, Supabase and Node type dependencies. This is **not** a successful full Next.js build.
- Master checklist: [x] isolated scene draft inputs; [x] 358 automated tests; [x] source syntax checks; [ ] install dependencies; [ ] successful Next.js build; [ ] browser interaction tests; [ ] live PostgreSQL; [ ] AI generation; [ ] deployment.
- Budgets remain $5 per three-minute music video and $20 per seven-minute animated episode. No paid generation, remote database modification, or deployment.

## Phase 68 — Storyboard readiness and review safeguards

- Added `lib/storyboard-readiness.mjs` to require both valid Visual Bible continuity and workflow-specific scene approvals before the UI reports a storyboard ready.
- Scene review now rejects missing scenes, locked productions, and attempts to approve scenes with missing style/location references or mismatched project IDs.
- The project dashboard uses the shared readiness function instead of treating automatic mode as inherently ready.
- Five new regression tests; `npm test`: **363 passed**.
- This is local planning validation only. No provider integration, real PostgreSQL verification, paid generation, or deployment was performed.

### Master checklist — Phase 68

| Item | Status |
| --- | --- |
| Multiple local projects, scenes, and backups | Implemented locally |
| Visual Bible changes invalidate previous approvals | Implemented locally |
| Scene approvals require valid continuity | Implemented and locally tested |
| Automatic-mode readiness requires continuity | Implemented and locally tested |
| Automated tests | 363 passed |
| Complete Next.js compilation | Pending dependencies |
| Chromium browser interaction verification | Pending |
| Live PostgreSQL integration and security verification | Pending |
| Paid AI generation and cloud deployment | Not connected |

Next priority: real Next.js compilation and browser verification in an environment with working package access. Budget limits remain $5 per music video and $20 per seven-minute episode.

## Phase 69 — Production/project type integrity

- Offline workspace validation now requires every production's `kind` to match its owning project's `kind`. This rejects tampered backups that could otherwise put a $20 episode under a $5 music-video project, or vice versa.
- Added two regression tests for backup creation and import validation.
- Verification: `npm test` **365 passed, 0 failed**; `npm run check:typescript-source` passed for 13 application files.
- Chromium test was attempted but blocked by `ERR_BLOCKED_BY_ADMINISTRATOR` when navigating to localhost. Browser interactions remain unverified.
- Full Next.js compilation still pending unavailable dependencies. No cloud database modifications, paid generation, or deployment.

### Master checklist — Phase 69

| Item | Status |
| --- | --- |
| Multiple local projects, productions, scenes, and backups | Implemented locally |
| Production/project type consistency for backup import | Implemented and tested |
| Storyboard approval and continuity safeguards | Implemented and locally tested |
| Automated Node tests | 365 passed |
| TypeScript source checks | 13 files passed |
| Full Next.js compilation | Pending dependencies |
| Chromium browser interactions | Blocked by environment |
| Live PostgreSQL verification | Pending |
| Paid AI generation and cloud deployment | Not connected |

Budget limits remain $5 per three-minute music video and $20 per seven-minute animated episode.

## Phase 70 — Storyboard record integrity

- `lib/workspace.mjs` now rejects missing or duplicate scene identifiers when adding storyboard scenes.
- Approval changes reject nonexistent scene IDs, non-boolean decisions, and completed productions.
- Added five regression tests in `tests/workspace-scene-integrity.test.mjs`.
- Verification: `npm test`: **370 passed, 0 failed**.
- Full Next.js compilation remains blocked: `registry.npmjs.org` returned `EAI_AGAIN` on this environment. Browser interaction and PostgreSQL verification remain pending.

### Master checklist — Phase 70

| Item | Status |
| --- | --- |
| Local multi-project management, storyboards and backups | Implemented locally |
| Scene identifier and approval record integrity | Implemented and tested |
| Visual continuity and approval safeguards | Implemented and locally tested |
| Automated Node tests | 370 passed |
| Full Next.js build | Blocked by unavailable npm registry |
| Chromium browser interactions | Pending environment access |
| Live PostgreSQL verification | Pending |
| Live AI generation and cloud deployment | Not connected |

Budgets remain $5 per three-minute music video and $20 per seven-minute animated episode. No paid generation or deployment occurred.

## Phase 71 — Atomic offline workspace persistence
- Introduced `preview/atomic-workspace.mjs` with one validated localStorage record for projects, productions, scenes and approvals.
- The offline preview loads the new record when present and falls back to older split-key records for compatibility.
- Imports write the validated workspace once, so quota errors cannot leave half-imported data across two keys.
- On a failed interactive save, the UI restores the last committed atomic workspace when available.
- Four new atomic persistence regression tests; 374/374 Node tests passed.
- `npm run check:source` passed. Chromium navigation remains blocked by this environment; a full Next.js build has not passed and npm dependencies remain unavailable.

### Master checklist (Phase 71)
- [x] Local project, production, storyboard and approval modules
- [x] Complete JSON workspace backups
- [x] Atomic workspace storage and failure recovery (local preview)
- [x] 374 automated Node tests
- [ ] Full Next.js dependency installation and successful build
- [ ] Chromium browser interaction test
- [ ] Live PostgreSQL transaction and RLS verification
- [ ] Live AI provider integration, real cost-cap verification and production export
- [ ] Cloud deployment and end-to-end acceptance tests

## Phase 72 — Safe offline workspace migration
- Added `loadOrMigrateWorkspace` to upgrade legacy split-key project and production data into the validated atomic v3 record on first load.
- Preserves legacy keys for manual recovery, migrates scenes and approvals, and refuses to overwrite a corrupted v3 record with older data.
- Blocks editing after migration/load errors instead of silently showing an empty workspace that could replace user work.
- Restores last committed atomic data on write failures, including failed first writes.
- Five new regression tests for migration, idempotency, corrupted data, and storage quota errors. 379/379 automated Node tests passed.
- Full Next.js compilation and real Chromium browser interactions remain unverified.

### Master checklist (Phase 72)
- [x] Local project, production, storyboard and approval modules
- [x] Complete JSON workspace backups
- [x] Atomic workspace storage and legacy migration protection
- [x] 379 automated Node tests
- [ ] Full Next.js dependency installation and successful build
- [ ] Chromium browser interaction test
- [ ] Live PostgreSQL transaction and RLS verification
- [ ] Live AI provider integration, real cost-cap verification and production export
- [ ] Cloud deployment and end-to-end acceptance tests

## Phase 73 — corrupt workspace recovery protection

The offline preview now blocks creation, editing, scene approval changes, and backup export if the saved workspace fails validation or migration. Previously a corrupt saved workspace could appear as an empty workspace and users could export an empty backup or begin edits that could not be persisted. A validated JSON import remains available for recovery; the error state clears only after the complete imported workspace has been successfully saved atomically. Four regression checks cover these safeguards. Browser-level execution remains unverified due to Chromium's localhost navigation restriction; the Next.js build remains unverified due to unavailable dependencies.

### Master checklist (Phase 73)
- [x] Local multi-project management, production drafts, storyboard planning, and scene approvals
- [x] Atomic workspace storage, migration, full JSON backup and recovery-import safeguards
- [x] Offline preview HTTP checks and Node regression suite
- [ ] Successful complete Next.js build
- [ ] Real Chromium browser interaction test
- [ ] Real PostgreSQL/RLS and concurrency verification
- [ ] Live AI providers, real spending-cap enforcement and full-length renders
- [ ] Secure cloud deployment and launch acceptance

## Phase 74 — Next.js workspace recovery protection

- The Next.js dashboard now validates its existing three localStorage collections before enabling editing; malformed JSON, invalid project kinds/modes, duplicate IDs, orphaned productions, mismatched production kinds, and invalid Visual Bible references block editing.
- Failed writes show a recovery-required message rather than continuing to mutate unsaved drafts. Multi-key saves use best-effort rollback of previously written keys, but browser localStorage is not a transactional database; atomic v3 offline-preview storage is still preferable for future consolidation.
- Five regression tests cover empty loads, round trips, corruption, cross-type production rejection, and write-failure rollback.
- 388/388 automated Node tests passed. TypeScript source checker passed 13 files. Full Next.js build is **not verified**: npm install fails with EAI_AGAIN (registry DNS resolution).

### Master checklist (Phase 74)
- [x] Local projects, productions, storyboards, scene approvals, and backups
- [x] Offline preview atomic storage and recovery protection
- [x] Next.js prototype browser-storage validation and write-error blocking
- [x] 388 automated Node tests and 13 TypeScript source checks
- [ ] Install Next.js dependencies and pass a complete `npm run build`
- [ ] Real browser interaction tests
- [ ] Consolidate Next.js prototype and offline-preview workspace storage
- [ ] Real PostgreSQL/RLS and concurrency verification
- [ ] Live AI provider integration and real spending-cap enforcement
- [ ] Secure deployment and full-length production acceptance tests

## Phase 75 — Offline-to-Next workspace migration
- Added `lib/offline-to-next-migration.mjs` and integrated it into the Next.js dashboard initial load.
- On first load **only when all three Next workspace keys are absent**, a valid offline v3 workspace can be copied into Next project, production, scene, approval, and default Visual Bible records. Original offline data is retained.
- Existing Next data, including damaged data, is never overwritten. Invalid offline data stops migration and blocks editing rather than silently discarding records.
- Four regression tests cover data preservation, non-overwrite, corruption, and no-op. 392/392 Node tests passed.
- The migration does not merge two nonempty workspaces or migrate Visual Bible details from the offline preview (which has no Visual Bible). Review generated default Visual Bibles before approving production.
- Full Next.js build, Chromium browser verification, PostgreSQL integration, live AI generation, and deployment remain pending.

### Master checklist — Phase 75
- [x] Offline preview and Next.js project/production migration bridge
- [x] Preserve offline source data and scene approvals
- [x] Protect existing Next.js workspaces from overwrite
- [x] 392 Node tests passing
- [ ] Full Next.js dependency installation and successful build
- [ ] Browser-level migration and interface testing
- [ ] Live PostgreSQL authorization and concurrency tests
- [ ] Live AI generation, full-length exports, and deployment

## Phase 76 — Canonical single-key Next.js workspace storage
- Added `NEXT_ATOMIC_KEY` to save projects, productions, scenes and Visual Bibles as one versioned snapshot. Browser localStorage's single `setItem` operation avoids torn multi-key writes.
- Existing three-key Next.js data remains readable. On the next successful save, the application writes a canonical snapshot and retains legacy keys as recovery copies.
- Offline-to-Next migration now checks both canonical and legacy keys, so it cannot overwrite a pre-existing canonical workspace.
- Added stronger scene ID and budget validations. Historical records without explicit spending fields are interpreted as zero for compatibility; malformed or over-budget values are rejected.
- Updated the old storage-failure regression test for the single-key contract and added five new tests.
- Verification: 397/397 Node tests passed; TypeScript source checker passed 13 files. A full Next.js build and Chromium browser testing remain unverified.

### Master checklist — Phase 76
- [x] Local project, production, scene, approval and Visual Bible modules
- [x] Offline-to-Next migration and single-key Next.js workspace persistence
- [x] Legacy workspace compatibility and failure-closed validation
- [x] 397 Node tests and 13 TypeScript source checks passed
- [ ] Install dependencies and successfully compile the full Next.js application
- [ ] Complete real browser interaction and migration tests
- [ ] Real PostgreSQL authorization and concurrency verification
- [ ] Live AI generation and actual cost-limit validation
- [ ] Staging and production deployment

## Phase 77 — raw workspace recovery export

The Next.js workspace recovery screen now offers **Download raw recovery copy** if workspace loading fails. The export collects canonical Next.js, legacy split-key, and offline atomic records without parsing or altering their contents. It may contain private creative work; store it securely. This is a forensic backup, not an importable project backup or automatic repair. Four tests cover malformed data preservation, multiple versions, empty exports, and read-only behavior.

### Master checklist (Phase 77)
- [x] Local project, production, storyboard, and Visual Bible editing
- [x] Approval safety and budget limits in local logic
- [x] Offline backup and migration safeguards
- [x] Raw recovery export from Next.js error screen
- [x] 401 automated Node tests and 13-file TypeScript source check
- [ ] Full Next.js dependency installation and successful build
- [ ] Chromium browser interaction verification
- [ ] Real PostgreSQL authorization and concurrency verification
- [ ] Live AI generation and cost reconciliation
- [ ] Secure cloud deployment

## Phase 78 — Scene and Visual Bible reference integrity

The canonical Next.js workspace validator now rejects duplicate Visual Bible character/location IDs, malformed scene character references, and scene references that do not resolve within the production's own project Visual Bible. Legacy scenes with no references remain valid. Failed validation occurs before browser storage is written, preserving the last valid snapshot.

Five regression tests were added in `tests/next-workspace-references.test.mjs`. The Node test suite passes **406/406**.

### Master checklist (Phase 78)
- [x] Local project, production, storyboard, and Visual Bible editing
- [x] Local approval safeguards and workspace backup/recovery
- [x] Canonical workspace storage, migration, and reference integrity validation
- [x] 406 automated Node tests
- [ ] Install application dependencies and complete a successful Next.js build
- [ ] Complete real Chromium browser interaction testing
- [ ] Verify real PostgreSQL permissions and concurrent job claims
- [ ] Connect AI providers and verify real-world spending limits
- [ ] Secure staging and production deployment

## Phase 79 — Real-browser CI verification

The GitHub Actions verification workflow now installs Python Playwright and its Chromium browser and runs `python browser-tests/test_preview.py` before the Next.js build. The browser runner uses the Playwright-managed Chromium by default; `VISION_CHROMIUM_PATH` overrides the executable for local systems. This is a test configuration, **not evidence of a successful GitHub Actions run**. Local Chromium navigation to localhost remains blocked by the execution environment.

**Master checklist (Phase 79):** Local workspace, storyboards, approvals, backup/recovery: implemented and covered by automated tests. CI browser test: configured, not yet run in GitHub. Full Next.js build: pending. Real PostgreSQL/RLS/concurrency: pending. Paid AI generation and deployment: not connected.

## Phase 80 — independent build and browser verification

The GitHub Actions verification workflow now has two **independent jobs**: `application-build` installs npm dependencies, runs Node tests and source checks, and compiles Next.js; `browser-preview` installs Playwright/Chromium and exercises the dependency-free offline preview. A failure in one job no longer prevents the other job from running. Each job uploads its own diagnostic log when available. The workflow has **not** been run on GitHub; both remote checks remain pending.

### Master checklist (Phase 80)

- [x] Local projects, storyboards, approvals and workspace recovery implemented
- [x] Independent CI build/browser verification jobs configured and regression-tested
- [ ] Upload source to an authorized GitHub repository and run the verification workflow
- [ ] Successful full Next.js compilation
- [ ] Successful real-browser interaction tests
- [ ] Live PostgreSQL integration and concurrency verification
- [ ] Live AI generation, cost enforcement and production export verification
- [ ] Cloud deployment and security acceptance testing

Local Chromium navigation is blocked by the execution environment (`ERR_BLOCKED_BY_ADMINISTRATOR`). The Next.js dependency installation is also unavailable locally. Neither check is claimed as passing.

## Phase 81 — Browser failure diagnostics

The offline-preview Chromium test now records a traceback (`browser-test-artifacts/failure.txt`) and attempts a full-page screenshot (`failure.png`) if browser verification fails. Playwright tracing is enabled and saved to `browser-test-artifacts/trace.zip` when Chromium launches successfully. The independent GitHub browser job uploads these diagnostics alongside its text log, including on failure. These artifacts may contain local test data; treat them as private. This does not constitute a successful browser run or full Next.js compilation.

**Master checklist:** local planning, approvals, continuity validation, backup/recovery and atomic workspace storage implemented; Node regression tests passed; GitHub independent build/browser jobs configured; full Next.js build, successful Chromium navigation, real PostgreSQL verification, live AI generation, and cloud deployment remain pending.

## Phase 82 — Next.js dashboard real-browser CI coverage

A third independent GitHub Actions job (`next-dashboard-browser`) now installs Next.js dependencies and Playwright Chromium, starts the actual Next.js dashboard, creates a project, reloads, and checks that it persisted. This supplements the existing **offline preview** Chromium job; it does not replace it. Browser failures retain server logs, trace, screenshot, and traceback where available. Three Node regression tests cover the configuration. **The new browser job has not yet run successfully.** Full Next.js compilation, browser interaction, PostgreSQL, live AI generation, and deployment remain unverified. The local environment still lacks npm dependencies and cannot run the real dashboard test.

### Master checklist (Phase 82)
- [x] Local workspace, scene approvals, continuity and backup/recovery logic implemented
- [x] Separate CI jobs for full Next.js build, offline preview browser, and Next.js dashboard browser configured
- [ ] Execute CI and confirm Next.js compilation succeeds
- [ ] Execute CI and confirm both Chromium browser suites pass
- [ ] Verify real PostgreSQL authorization and concurrency
- [ ] Verify AI provider integration and real cost enforcement
- [ ] Secure staging and production deployment

## Phase 83 — Next.js browser startup readiness

The Next.js Chromium CI job now waits for the dashboard to return HTTP 200 before starting Playwright. This removes a startup race that could produce false-negative browser tests on slower GitHub runners. The bounded probe retries for up to approximately 45 seconds, fails explicitly when the server does not become ready, and uploads a separate readiness log. Four regression tests cover transient failures, exhaustion, invalid configuration, and workflow ordering. **This is CI configuration, not evidence of a successful remote run.**

### Master checklist (Phase 83)
- [x] Local projects, storyboards, approvals, backup and recovery implemented
- [x] Separate build, offline browser and Next.js browser jobs configured
- [x] Next.js startup readiness gate and diagnostics implemented
- [ ] Execute GitHub CI and confirm full Next.js build succeeds
- [ ] Execute both Chromium browser suites successfully
- [ ] Live PostgreSQL, AI provider, budget enforcement and deployment verification

## Phase 84 — Browser migration and recovery acceptance scenarios

The Next.js Chromium browser script now exercises three distinct browser profiles: normal project creation and persistence, first-load migration from offline v3 storage into the canonical Next workspace without deleting the offline source, and fail-closed handling of damaged Next storage with a downloadable raw recovery copy. These are **configured acceptance scenarios**, not completed browser executions. Three regression tests verify that the scenarios remain present. Local Node tests and source checks pass; full Next.js compilation and Chromium execution remain unverified until CI runs against a repository containing this source.

### Master checklist (Phase 84)
- [x] Local workspace, approvals, backup/recovery and migration implemented
- [x] Independent CI build, offline browser and Next dashboard browser jobs configured
- [x] Browser scenarios for offline-to-Next migration and damaged-workspace recovery authored
- [ ] Run GitHub workflow and confirm Next.js compilation and Chromium acceptance scenarios pass
- [ ] Live PostgreSQL, paid AI generation budget enforcement, and deployment verification

## Cloudflare build-time Supabase configuration

For the owner-only cloud workspace, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in **Cloudflare Builds → Variables and secrets** before building. The `NEXT_PUBLIC_` values are embedded into the Next.js client bundle at build time; changing only Worker runtime variables will not update a previously built bundle. Use the publishable key, never a secret or service-role key. Redeploy from the Git-connected production branch after changing build variables. Owner authorization and RLS are configured separately in Supabase.
