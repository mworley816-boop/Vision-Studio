# Runway connection setup (no generation)

Vision Studio has an owner-authenticated, read-only Runway connection check. It does **not** submit video jobs, approve spending, verify pricing, or change the music ($5) and episode ($20) hard caps.

## Cloudflare Workers deployment

1. Open the Cloudflare dashboard and select **Workers & Pages → vision-studio → Settings → Variables and Secrets** (labels can vary by dashboard version).
2. Add a **Secret** named `RUNWAYML_API_SECRET` with your Runway Dev API secret. Never add this to a `NEXT_PUBLIC_` variable, GitHub commit, pull request, or client-side configuration.
3. Save and redeploy the Worker so the runtime receives the secret. If you use separate production and preview environments, configure the secret separately for each environment you intend to test.
4. Sign in to Vision Studio with your enrolled Studio owner account. Open the production preflight section and expand **Runway API connection · No charge**.
5. Click **Check Runway connection · No charge**. The endpoint uses a server-side authenticated GET request to Runway's organization endpoint. It does not create a generation job.

### Results

- **Runway credentials accepted**: Runway returned a successful authenticated read-only response. This does not verify pricing, credit balance, or generation readiness.
- **Secret not configured**: the deployed Worker has no usable `RUNWAYML_API_SECRET`.
- **Credentials rejected**: Runway rejected authentication; verify the secret privately.
- **Connection unavailable / unverified**: check outbound connectivity, provider service availability, and deployment logs without printing secrets.
- **Owner access unavailable**: sign in with the enrolled owner account and confirm Supabase server configuration.

### Local development

Set `RUNWAYML_API_SECRET` only in a private ignored server environment file (such as `.env.local`) or your shell environment. Do not commit it. Local tests mock Runway responses and do not require a live key.

### Security and next milestone

The connection endpoint accepts POST only, checks same-origin requests, requires an authenticated enrolled owner, and returns a restricted status. Keep paid generation disabled until independently verified model pricing, an enforceable total-cost quote, and an explicit spending approval are implemented and tested.
