# Integration: send events to the MrBrooks Admin Portal

This document is the source-of-truth recipe for wiring LifeOS up to the
self-hosted observability portal at `https://portal.mrbrooks.biz`. It mirrors
[`~/repos/MrBrooks Admin Portal/docs/INTEGRATION.md`](../../MrBrooks%20Admin%20Portal/docs/INTEGRATION.md);
the MrBrooks file is canonical — read this for LifeOS-specific scope only.

## What you get

Once integrated, the LifeOS app will send:

- **Errors** with full stack traces and breadcrumbs
- **Performance traces** (10% sample rate) — every route load and
  route-handler invocation
- **Custom events** for future analytics (e.g. task completion, Big Rock
  scheduling)
- **Heartbeats** if added later (the SDK is configured; the route handler
  isn't shipped yet)

To the portal at `https://portal.mrbrooks.biz`.

## Register the app

Use the programmatic path — LifeOS is an AI-agent-friendly project so the
programmatic OTK flow is the right one. Two secrets gate the flow; both
are in `/secret` and Railway:

- `ADMIN_API_TOKEN` — for the create call.
- `PROJECT_REDEEM_SECRET` — for the redeem call. Held by an external
  process; the agent never sees it.

**Step 1 — create the project.** Returns a one-time redeem code (never the
API key):

```bash
curl -X POST https://portal.mrbrooks.biz/api/apps/programmatic \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LifeOS",
    "slug": "lifeos",
    "framework": "nextjs",
    "repoUrl": "https://github.com/larspage/life-is-hard-planner",
    "environmentDefault": "production"
  }'
```

Save the returned `redeem_code` (lifetime: 1 hour, single-use) into your
deploy-time secret store. Do not log it.

**Step 2 — redeem at first run.** Returns the API key exactly once:

```bash
curl -X POST https://portal.mrbrooks.biz/api/apps/redeem \
  -H "Authorization: Bearer $PROJECT_REDEEM_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"redeem_code": "<paste>"}'
```

Write `api_key` into `.env.local` as `MR_BROOKS_DSN`'s basic-auth user:

```
MR_BROOKS_DSN=https://<api_key>@portal.mrbrooks.biz/lifeos
NEXT_PUBLIC_MR_BROOKS_DSN=https://<api_key>@portal.mrbrooks.biz/lifeos
```

## Wire the SDK

The SDK ships with the project already (`@sentry/nextjs`). The runtime-specific
config files exist:

- `sentry.client.config.ts` — browser-side
- `sentry.server.config.ts` — Node.js
- `sentry.edge.config.ts` — edge

`instrumentation.ts` loads the right one based on `process.env.NEXT_RUNTIME`.
`next.config.mjs` wraps the config with `withSentryConfig(...)`.

No code changes are required to wire the SDK — only the env vars above and
the deploy step below.

## Per-environment vars

Per development-standards §C ("Integration patterns"), use a project-named
env var rather than `NODE_ENV`:

- `NEXT_PUBLIC_ENV` for Next.js — read inside `sentry.client.config.ts`
  and `sentry.edge.config.ts`.
- The Sentry SDK reads `process.env.NEXT_PUBLIC_ENV` directly via the
  `environment` field on `Sentry.init({ ... })`. Setting this in Railway
  per environment keeps the portal's per-env dashboards clean.
- `NEXT_PUBLIC_GIT_SHA` — the deployment commit SHA. CI sets this from
  `${{ github.sha }}` so every event in the portal knows the release.

## Verify after deploy (REQUIRED before marking v0.2.0 done)

1. Deploy the app to staging (`railway up --environment staging`).
2. Open `https://staging.lifeos.app/api/health` to confirm liveness.
3. Trigger a deliberate error: visit
   `https://staging.lifeos.app/api/__deliberate-error__` (which the
   server should 500 on). If that route doesn't exist, deploy a temporary
   one-page route that throws unconditionally; remove it after the test.
4. Open `https://portal.mrbrooks.biz`, sign in, navigate to LifeOS →
   events.
5. The error must land within 30 seconds (typical: 1–5s). If it doesn't:
   - Check the SDK is sending: look for outbound POSTs to
     `portal.mrbrooks.biz/api/lifeos/envelope/` in the deploy logs.
   - 401 → `MR_BROOKS_DSN` is wrong. Re-check.
   - 404 → slug mismatch. Confirm the project was registered as `lifeos`.
   - 429 → rate limit exceeded. Default is 1000 events/minute; raise via
     the portal.
6. Mark the v0.2.0 milestone as integration-verified once a deliberate
   error from staging lands in the portal's `events` table within 30s.

This recipe is the integration QA gate (development-standards §A). Skipping
it means shipping a project the operator can't observe.

## Vercel CI awareness

If life-is-hard-planner is ever deployed via Vercel instead of Railway
(the prior layout shipped a Docker compose for self-host, but the rewrite's
`railway.toml` is the only deploy config in-repo today), the env-var rule
is the same — use `NEXT_PUBLIC_ENV`, never `NODE_ENV`.

## Portal SDK parity with other MrBrooks apps

- [`mrbrooks-admin-portal` `INTEGRATION.md`](../../MrBrooks%20Admin%20Portal/docs/INTEGRATION.md)
  — the canonical reference for any browser- or server-side details that
  aren't LifeOS-specific.
- Other MrBrooks apps (NJ DSS, restaurantroller, ful-marketing-site) follow
  the same register → install → init → env → verify → rollback flow.
  When in doubt, fall back to the MrBrooks canonical file.
