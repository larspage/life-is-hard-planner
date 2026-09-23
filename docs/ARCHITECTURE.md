# Architecture

## Overview

LifeOS is a single-tenant, end-user planning app for the Franklin Covey +
bullet-journal methodology (see `SPEC.md`). It exposes a Next.js 14 App
Router UI and a small set of REST endpoints backed by a Postgres database
managed through Drizzle ORM. Authentication is handled by NextAuth v4 with a
GitHub OAuth provider in production and an email/password credentials
provider in development. Error telemetry flows to the MrBrooks Admin Portal
via `@sentry/nextjs` (the portal ships with a Sentry-compatible envelope
ingest).

## System diagram

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│   • @sentry/nextjs (browser SDK) ─┐                                  │
│                                   │ POST /api/<slug>/envelope/       │
│   • fetch /api/...  ──────────────┤ (Sentry-compatible envelope)     │
└───────────────────────────────────┼──────────────────────────────────┘
                                    │  TLS, per-app API key
┌───────────────────────────────────▼──────────────────────────────────┐
│  Next.js 14 — single Railway service ("web")                         │
│                                                                      │
│  App Router pages (server components)  ─►  render UI from Drizzle     │
│  Route Handlers (app/api/...)          ─►  REST endpoints             │
│  NextAuth handler (app/api/auth/...)   ─►  OAuth + credentials        │
│  Sentry SDK init (instrumentation.ts)  ─►  error envelope on failure  │
│       │                                                              │
│       │  reads / writes                                              │
│       ▼                                                              │
│  PostgreSQL  (via Drizzle ORM + postgres-js)                          │
│   • users, roles, values, goals, tasks, time_blocks                   │
│   • habits, habit_logs, journal_entries, file_uploads  (schema only,   │
│      UI deferred per ADR-007)                                         │
└──────────────────────────────────────────────────────────────────────┘
```

## Components

### Next.js 14 App Router

The single Next.js process serves both the UI and the API. Route groups
separate auth-only pages (`app/(auth)/`) from the post-login portal
(`app/(portal)/`). Server components fetch via Drizzle directly; client
components only inside interactive forms (e.g. the login form, the sign-out
button). This minimizes client-side JS and keeps the auth state available in
every server-rendered response.

### Drizzle ORM

Drizzle replaces the prior Prisma ORM (the rewrite deletes
`apps/api/prisma/`). All schema lives at `db/schema.ts`; generated migrations
land in `db/migrations/` and run on deploy via `npm run db:migrate`. Drizzle
chose over Prisma for three reasons — see ADR-002.

### NextAuth v4

Auth is JWT-only (no Drizzle adapter). GitHub OAuth is the production
primary; a CredentialsProvider is enabled in development only via
`ENABLE_CREDENTIALS_PROVIDER=true`. The 60-day trial downgrade logic from the
prior Express backend is ported to a `signIn` event hook in `lib/auth.ts`.
See ADR-004.

### Portal SDK (@sentry/nextjs)

Errors in the browser, server, and edge runtimes ship to the MrBrooks Admin
Portal via Sentry-compatible envelopes. The runtime-specific Sentry init
files (`sentry.client.config.ts`, `sentry.server.config.ts`,
`sentry.edge.config.ts`) are loaded by `instrumentation.ts`. See ADR-005
and [`INTEGRATION.md`](INTEGRATION.md) for the full register → install →
init → env → verify → rollback flow.

### Postgres + postgres-js

`postgres-js` is the Postgres driver; the Drizzle client is created lazily
inside a Proxy (so importing `@/db` does not trigger a connection at
module-load time). Connection pooling and graceful shutdown are handled in
`db/index.ts`.

## Data flow

### Read path (UI)

1. Server component calls `requireUserId()` from `lib/auth.ts`. If no
   session, redirect to `/login`.
2. The component calls Drizzle query helpers with the `userId` filter.
3. The query joins / filters by user ownership, returns rows.
4. Server component renders UI from the rows. No API hop is required.

### Write path (UI ↔ API)

1. Client component submits a form, hitting a route handler under `app/api/`.
2. Route handler calls `requireUserId()` again (defense-in-depth — the
   cookie might be stale by the time the fetch lands).
3. The body is validated against a `zod` schema in `lib/validation.ts`.
4. The Drizzle query executes with the `userId` filter; the response is
   wrapped in the `ApiResponse<T>` shape from `lib/api.ts`.

### Error path (portal)

1. Any uncaught error in a runtime is captured by the Sentry SDK.
2. The SDK posts an envelope to `<portal-host>/api/<slug>/envelope/`.
3. The portal authenticates the request, queues the event, and the worker
   consumes + groups + writes it to `events` + `issues` tables.
4. The portal dashboards reflect the event within ~1–5 seconds under load.

## Appendix A: ADR log

### ADR-001: Single Next.js 14 app at the repo root (no `apps/*`, no `packages/*`)

- **Status**: Accepted (2026-09-15)
- **Context**: The prior layout was a yarn 1 workspace with three packages
  — `apps/api` (Express), `apps/web` (Next.js landing page), and
  `packages/shared` (time-units math). Every internal call between them
  required transpilation glue (`transpilePackages: ['@lifeos/shared']`),
  and every shared type needed re-exports through a workspace import path.
  Adding a route required editing three `package.json`s and a top-level
  `tsconfig.json`'s `paths`.
- **Options**:
  - **Single Next.js 14 app at repo root** — one `package.json`, one
    `tsconfig.json`, no workspace tooling. Routes live in `app/api/` and
    share imports naturally. Slight loss: the separate `apps/api` build
    target is gone; can't `railway up` the API standalone.
  - Keep yarn workspaces, add a new `@lifeos/api` package alongside `@lifeos/web`,
    convert the Express routes to a `node-server.ts` adapter inside the
    Next.js `pages/` directory. Carries forward all the import-path pain.
  - pnpm workspace — same shape, different lockfile. Doesn't fix the
    Express split.
- **Decision**: Single Next.js app at repo root, npm (per ADR-003). The
  loss of the standalone API target is theoretical: the prior Express
  server was never deployed separately; it ran in-process with the web
  bundle in `rundev.sh`.
- **Consequences**:
  - One `tsconfig.json`, one lockfile, one `npm install`.
  - No worker, no cron, no separate ingest — LifeOS has no need. The
    three-service Railway topology from development-standards §B is
    inapplicable to this app; documented here so future maintainers don't
    re-add a needless worker.
  - All shared code lives at `lib/` or `db/`, importable via the
    `@/` path alias.
  - Future split (e.g. into a worker for async tasks) becomes a larger
    refactor — the `app/` directory would need to be hoisted, not
    lifted.

### ADR-002: Drizzle ORM over Prisma

- **Status**: Accepted (2026-09-15)
- **Context**: Prisma was the prior choice (`apps/api/prisma/schema.prisma`).
  Prisma's generated client is ~15MB on disk and ~5MB in the bundle; the
  generated code is checked into `node_modules`, not the repo, which makes
  "did I regenerate?" impossible to spot in code review. Drizzle's
  schema-as-TypeScript and migrations-as-SQL approach reads closer to
  Postgres and ships less code.
- **Options**:
  - **Drizzle ORM** — SQL-shaped types, schema authored in TS, migrations
    emitted as raw SQL. Standard at MrBrooks Admin Portal.
  - Prisma — keep the schema, regenerate the client. Mature, but bundles
    heavily and the schema language is its own dialect (`@@map`,
    `@@index`, `dbgenerated`).
  - Kysely — type-safe query builder with no schema file. Requires manual
    SQL migration scripts.
  - Raw SQL with `pg` — zero abstractions. Too much work for an app with
    10 tables and 7 enums.
- **Decision**: Drizzle. Matches the canonical stack; the MrBrooks Admin
  Portal already uses it (`db/schema.ts` reference).
- **Consequences**:
  - All schema lives in `db/schema.ts` — readable, code-reviewed.
  - Migrations are committed SQL in `db/migrations/`, portable and
    diff-friendly.
  - Type inference (`$inferSelect`, `$inferInsert`) gives every model a
    DTO shape that can be re-exported.
  - One downside: `bigint` columns map to `BigInt` in JS, which JSON
    serialization can't carry natively. Handled in the response shaping
    by converting to string when needed (the `uploadedBytes` column is
    the only one in this schema).

### ADR-003: npm over yarn 1

- **Status**: Accepted (2026-09-15)
- **Context**: The prior workspace used yarn 1.22 (`packageManager` field
  set in root `package.json`). yarn 1 is in maintenance — no longer
  receiving feature updates, only security. Yarn Berry (PnP, zero-installs)
  is the modern successor but changes the `node_modules` layout drastically.
- **Options**:
  - **npm** — what the MrBrooks Admin Portal uses. Ships with Node,
    zero install step. Hoisted `node_modules`, conventional layout.
  - pnpm — strict `node_modules`, fast, content-addressed store. Best for
    monorepos, less overhead for a single-package app.
  - yarn Berry (PnP) — drops `node_modules` entirely. Improves install
    speed massively but introduces `.pnp.cjs` and changes every tool that
    reads `node_modules`.
- **Decision**: npm. The canonical reference uses npm; this is a
  single-package app so pnpm's monorepo strengths don't apply; yarn
  Berry's tooling cost is not earned here.
- **Consequences**:
  - `package-lock.json` is the source of truth; `yarn.lock` is gone.
  - All `scripts` use the same `npm run <name>` shape that the rest of
    the MrBrooks family already uses (lower cognitive overhead).
  - Engines pinned to `node >= 20` — matches the @sentry/nextjs 7.x and
    drizzle-orm 0.33 minimums.

### ADR-004: NextAuth (GitHub OAuth + dev credentials) over mock JWT

- **Status**: Accepted (2026-09-15)
- **Context**: The prior auth was a custom Express middleware that issued
  and verified JWTs (`apps/api/src/middleware/auth.ts` + `routes/auth.ts`).
  It had a `MOCK_AUTH=true` dev mode that bypassed bcrypt verification
  entirely. Mock auth carries two costs: (a) the mock implementation
  diverges from production silently; (b) the JWT issuance, refresh, and
  signing logic is bespoke and not security-reviewed.
- **Options**:
  - **NextAuth v4** with GitHub OAuth (production) + CredentialsProvider
    (development, gated by `ENABLE_CREDENTIALS_PROVIDER=true`). Library
    owns JWT signing, session refresh, CSRF, and OAuth callback handling.
  - Lucia Auth — TypeScript-first, schema-agnostic, more boilerplate per
    route.
  - Clerk — SaaS, monthly cost. Out of scope for owner-only apps.
  - Keep the bespoke JWT middleware. Carry the existing security debt.
- **Decision**: NextAuth v4 with the same GitHub + dev-credentials pattern
  as `~/repos/MrBrooks Admin Portal/lib/auth.ts` (canonical reference).
  The dev-only CredentialsProvider keeps Larry's `larry@lifeos.app`
  workflow alive without standing up GitHub OAuth locally.
- **Consequences**:
  - No user-registration UI in this rewrite — users log in via GitHub or
    (in dev) seeded credentials. Registration is a future-phase concern.
  - The 60-day trial downgrade logic moves to a NextAuth `signIn` event
    hook in `lib/auth.ts`. Same semantics, different code path.
  - The `users.email` column stays `UNIQUE` so the credentials lookup
    (`eq(users.email, parsed.data.email)`) is fast.
  - No `accounts`, `sessions`, or `verification_tokens` table — JWT session
    strategy doesn't require them. Re-add them if/when account linking
    (e.g. "Sign in with Google too") becomes a requirement.

### ADR-005: Portal SDK (@sentry/nextjs) over Winston + Loki + Grafana

- **Status**: Accepted (2026-09-15)
- **Context**: The prior stack used Winston with `winston-loki` transport
  flowing to a self-hosted Loki + Grafana pair (`apps/api/src/lib/logger.ts`
  - `docker-compose.yml` Loki/Grafana services). That gave one log line per
    call but no error grouping, no trace correlation, no alerting, and no
    per-project visibility. Every MrBrooks project's errors should land in
    one place — the MrBrooks Admin Portal — so the operator dashboard at
    `portal.mrbrooks.biz` shows every issue across every app.
- **Options**:
  - **@sentry/nextjs + the portal SDK integration** — instrumented errors,
    traces (10% sample rate), release tagging, env tagging. Pushed to the
    portal via the Sentry-compatible envelope.
  - Winston + Loki retained — carry the prior cost.
  - Datadog — SaaS, monthly cost, overkill for an owner-only app.
  - Axiom — newer SaaS log store. Same shape as Datadog for this scale.
- **Decision**: @sentry/nextjs with the MrBrooks Admin Portal as the
  ingest target (`MR_BROOKS_DSN` / `NEXT_PUBLIC_MR_BROOKS_DSN`). The portal
  is the Sentry-compatible backend so the SDK works without modification.
- **Consequences**:
  - `instrumentation.ts` loads three runtime-specific config files at
    startup; one per runtime (nodejs, edge, client).
  - `app/error.tsx` and `app/global-error.tsx` capture render errors via
    `Sentry.captureException`. The portal integration QA gate
    (development-standards §A) requires these to exist.
  - Local dev (`NEXT_PUBLIC_ENV=development`) keeps events out of the
    portal unless `beforeSend` is overridden — see the
    `sentry.client.config.ts` comment for the deliberate-error recipe.
  - Loki + Grafana removed entirely. Runbooks that referenced them are
    updated in [`RUNBOOK.md`](RUNBOOK.md).

### ADR-006: CSS Modules + `app/globals.css` tokens (override MrBrooks ADR-011 rationale)

- **Status**: Superseded by ADR-006.b (2026-09-19)
- **Context**: MrBrooks Admin Portal's ARCHITECTURE.md ADR-011 (Accepted
  2026-08-19) chose CSS Modules + `app/globals.css` over Tailwind. The
  rationale there — "owner-only console, needs no marketing-grade
  surface" — does not apply here. LifeOS is an end-user planning app:
  typography, role-color coding, and the warm-cozy aesthetic from the
  prior landing page all need a richer styling surface. The LCP of the
  landing page is a UX-critical metric for that audience.
- **Options**:
  - **CSS Modules + `app/globals.css` tokens** — what MrBrooks ADR-011
    chose. Zero new dependencies, no PostCSS pipeline. Risk: feels dated
    for a consumer-facing product.
  - **Tailwind 3** — what the original yarn-workspace `apps/web` used.
    Mature ecosystem, large component surface, but adds PostCSS +
    content-glob config and pulls in a Tailwind plugin for shadcn/ui if
    we adopt that later. CSS-in-JS is a non-starter under App Router's
    server components.
  - **Tailwind + shadcn/ui** — strongly-typed primitives, copy-paste
    component model, dark-mode-free baseline. Highest startup cost.
  - **Radix UI primitives + custom CSS** — accessible primitives, every
    component is hand-rolled. Slowest path to a usable UI.
- **Decision**: **CSS Modules + `app/globals.css` tokens**, exactly as
  MrBrooks ADR-011. Override of rationale: end-user apps deserve
  consistent design tokens without the Tailwind dependency cost. The
  visual surface stays modest: a single light theme, hand-rolled
  primitives (`.btn`, `.card`, `.badge`, `.input`) in
  `@layer components`, spacing tokens in `:root`.
- **Consequences**:
  - One global stylesheet, one token system, no build pipeline beyond
    Next.js's built-in CSS Modules support.
  - Designers learn the token system instead of utility classes. The
    token names match the MrBrooks system so cross-project cross-pollination
    is easy.
  - Light-mode only; the `@media (prefers-color-scheme: dark)` block
    sits empty as a future-phase placeholder.
  - Adding Tailwind later is a one-file swap (`postcss.config.js`,
    `tailwind.config.ts`, `@tailwind base;` in `globals.css`) — the
    token system stays the source of truth either way.

### ADR-007: Defer subscription, uploads, habits, journal — schema stays

- **Status**: Accepted (2026-09-15)
- **Context**: The prior schema (`docs/schema.prisma`) had 10 tables
  including the three-phase-out features: `subscriptions` (via the
  `users.subscriptionTier` enum + `trialExpiresAt` columns), `uploads`
  (`file_uploads` table + `uploadedBytes` column), `habits` + `habit_logs`,
  and `journal_entries`. The corresponding API routes in `apps/api/src/`
  were stubs (`routes/subscription.ts`, `routes/uploads.ts`) — 10 lines
  each, placeholder returns. The Phase 4–13 roadmap absorbed into the
  brain (`[[lifeos-roadmap-2026-09-15-snapshot]]`) covers these in
  detail.
- **Options**:
  - **Drop the deferred tables and columns** — keep the schema tight to
    what ships. A future phase would re-add them via migration.
  - **Keep the schema complete, defer only the UI/API** — future phases
    don't need a schema change to ship. CRUD endpoints, MR API, dashboard
    surfaces all start from existing columns.
- **Decision**: Keep the schema complete. The migration `0000_initial_schema.sql`
  is the single source of truth for the post-rewrite baseline; future
  phases add migrations on top rather than re-adding dropped columns.
- **Consequences**:
  - `SPEC.md` flags subscription / uploads / habits / journal as
    **deferred** with an explicit "out of scope for v0.2.0; planned for
    v0.3.0+" note.
  - The `(portal)/` route group only mounts dashboards for roles, values,
    goals, tasks, time-blocks. The corresponding menu items exist in
    `app/(portal)/layout.tsx`; absent resources are silent.
  - The 60-day trial downgrade in ADR-004 still runs against the
    `users.subscriptionTier` column even though subscription itself is
    deferred — the column is the persistence half of the trial promise.

### ADR-006.b: Tailwind 3 + shadcn/ui + Volt design language

- **Status**: Accepted (2026-09-19)
- **Context**: ADR-006 chose CSS Modules + `app/globals.css` tokens to
  minimize build pipeline. The decision was right for an owner-only console
  but undersized for an end-user planning app: typography, role-color coding,
  and the warm-cozy aesthetic from the prior landing page need a richer
  surface. The 2026-09-19 re-scoping prioritizes design quality.
- **Options**:
  - **Tailwind 3 + shadcn/ui primitives + a Volt design language** —
    copy-paste components, strongly typed, themable via CSS variables.
    Pixel (the web-designer agent) uses the `volt-design-md` skill to import
    a brand aesthetic (Linear, Notion, Stripe, etc.) and applies it via
    shadcn's CSS-variable theming.
  - Tailwind 3 alone (no component library) — full hand-roll. Slowest path
    to a usable UI; reinvents buttons, modals, dropdowns.
  - Tailwind + Park UI (Ark UI + Panda CSS) — stronger a11y primitives,
    CSS-in-JS instead of utility classes. More setup; less common in the
    MrBrooks family.
  - Stay on CSS Modules + globals — what ADR-006 said. Rejected: undersized
    for the target audience.
- **Decision**: Tailwind 3 + shadcn/ui primitives + Volt design language. The
  Volt design (selected by Pixel during the design pass) becomes the source
  of truth for tokens; Tailwind utilities compose those tokens.
- **Consequences**:
  - PostCSS pipeline + `tailwind.config.ts` + `globals.css` with
    `@tailwind base/components/utilities`.
  - shadcn primitives copied into `app/_components/ui/`; we own the source.
  - `tailwind-merge` becomes a hard dep (shadcn's `cn()` helper).
  - The hand-rolled `.btn`, `.card`, `.badge`, `.input` classes from
    ADR-006 are replaced by shadcn primitives.
  - Future design changes are Pixel-driven via the `volt-design-md` skill,
    not utility-class archaeology in the codebase.

### ADR-008: Supabase Postgres + RLS (Drizzle stays as query builder)

- **Status**: Accepted (2026-09-19)
- **Context**: Drizzle has no RLS story. Tenant isolation lives entirely in
  application code (`requireUserId()` + `eq(table.userId, userId)` on every
  query). One missed filter anywhere leaks another user's data. Supabase
  provides managed Postgres with first-class Row-Level Security: policies
  are SQL the database enforces regardless of the query path.
- **Options**:
  - **Supabase Postgres + RLS, keep Drizzle** — Drizzle connects to
    Supabase-managed Postgres. RLS policies live in `db/migrations/*.sql`.
    The connection layer wraps every transaction with `SET LOCAL
app.user_id` so policies can compare against the calling user.
  - Full Supabase SDK (`@supabase/supabase-js`), drop Drizzle — bigger
    rewrite; loses Drizzle's TS-first schema; ADR-002 reverses entirely.
  - Self-hosted Postgres + manual RLS policies — same outcome as option 1
    but with the operational cost of running Postgres ourselves.
- **Decision**: Supabase Postgres + RLS, Drizzle stays. Supabase is the NJDSS
  canonical pattern (per 2026-09-19 direction). Drizzle continues to own
  schema-as-TS and migrations-as-SQL; the DB tier moves to Supabase.
- **Consequences**:
  - `DATABASE_URL` points at Supabase's connection pooler (port 6543 in
    transaction mode, not 5432 direct).
  - `db/migrations/0001_rls_policies.sql` adds `CREATE POLICY ...` statements
    for every user-owned table. Policies compare against a
    `current_setting('app.user_id', true)::uuid` GUC that the connection
    layer sets per request. Pattern per table:
    ```sql
    CREATE POLICY user_isolation ON <table>
      USING (user_id = current_setting('app.user_id', true)::uuid);
    ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
    ```
  - The Drizzle session factory in `db/index.ts` wraps each transaction with
    `SET LOCAL app.user_id = '<uuid>'` after `requireUserId()`. Missing GUC
    → query returns zero rows (the policy's `current_setting(..., true)`
    returns NULL, which never equals any `user_id`).
  - **RLS fallback for application bugs.** Application code MUST filter by
    `eq(table.userId, userId)` on every query. RLS is the safety net: if a
    query lands without the filter, the DB returns zero rows. The pattern is
    "two lines of defense, neither one alone is sufficient."
  - System tables (no per-user rows; future lookup values, enum constants,
    app-level config) are exempt. The schema has no such tables today; the
    rule for new tables is: if it has a `user_id` column, it gets a policy;
    if it doesn't, it's a system table.
  - Application code's `eq(table.userId, userId)` stays as defense-in-depth
    and as a documentation aid (the intent is visible in the query).
  - Supabase dashboard becomes the ops surface for inspecting RLS policies
    and slow queries.
  - ADR-002 (Drizzle over Prisma) is unchanged — it governs the query
    builder; ADR-008 governs the DB tier.

### ADR-009: Custom error class hierarchy (replaces `throw new Response(...)`)

- **Status**: Accepted (2026-09-19, refined 2026-09-19)
- **Context**: `lib/auth.ts:137` throws a `Response` object, and every route
  handler must remember `if (err instanceof Response) return err` to recover
  it. `lib/api.ts:42-45` has the same shape with `serverError`. One handler
  that forgets the check swallows the 401 and returns a 500. The pattern is
  unidiomatic and easy to break. Mirrors the C# `Exception` model that the
  owner prefers.
- **Decision**: A typed `AppError` base class with narrow subclasses. Each
  subclass carries an HTTP status code (per RFC 9110, the IANA-registered
  list) and a stable error code string. A single `errorToResponse(err:
unknown): Response` mapper in `lib/errors.ts` turns any thrown value into
  a typed JSON response using `lib/api.ts` helpers.

  **The hierarchy** (4xx first, then 5xx):

  | Class                     | Status                    | Code                  | When                                                             |
  | ------------------------- | ------------------------- | --------------------- | ---------------------------------------------------------------- |
  | `AuthError`               | 401 Unauthorized          | `unauthorized`        | no session / bad session                                         |
  | `ForbiddenError`          | 403 Forbidden             | `forbidden`           | session valid, can't access (RLS denies, role check fails)       |
  | `InvalidParameterError`   | 400 Bad Request           | `invalid_parameter`   | malformed body from a non-form caller                            |
  | `UnprocessableError`      | 422 Unprocessable Content | `unprocessable`       | body parsed, business rule failed (form should have caught this) |
  | `PayloadTooLargeError`    | 413 Content Too Large     | `payload_too_large`   | body too big (future)                                            |
  | `RateLimitedError`        | 429 Too Many Requests     | `rate_limited`        | rate limit hit (future)                                          |
  | `NotFoundError`           | 404 Not Found             | `not_found`           | no row                                                           |
  | `ConflictError`           | 409 Conflict              | `conflict`            | unique violation, optimistic-lock loss                           |
  | `MethodNotAllowedError`   | 405 Method Not Allowed    | `method_not_allowed`  | wrong HTTP verb                                                  |
  | `InternalError`           | 500 Internal Server Error | `server_error`        | anything else                                                    |
  | `NotImplementedError`     | 501 Not Implemented       | `not_implemented`     | endpoint exists in spec but not yet built                        |
  | `ServiceUnavailableError` | 503 Service Unavailable   | `service_unavailable` | db down, etc. (future)                                           |

  **The 400 vs 422 split** matters because form validation lives on the
  client, not the server:
  - **400** is for "I can't parse this." The form should prevent this
    (field-level checks, type/range validation). The server only fires
    400 when a non-form caller (curl, replay, bad client) sends garbage.
  - **422** is for "I parsed it fine, but the result violates a business
    rule" — e.g. endTime ≤ startTime. The form _should_ check this
    before submit; if it lets it through, the server returns 422.

  Form validation itself (`required`, `regex`, `maxLength`) is **not** an
  error — it's a client-side function that highlights fields and blocks
  submission. The server never sees it. When the CRUD UI lands in beta
  per ADR-010, `lib/forms.ts` will hold these as plain functions
  returning `{ ok: boolean, fieldErrors: Record<string, string> }`.

- **Consequences**:
  - `requireUserId()` throws `AuthError`, not `Response`.
  - Route handler bodies become:
    ```ts
    try {
      const userId = await requireUserId();
      // ...
      return ok(row);
    } catch (err) {
      return errorToResponse(err);
    }
    ```
  - `withErrorHandling(handler)` wraps a handler so the try/catch is
    implicit. The handler can throw any `AppError` and the wrapper maps
    it.
  - The mapper is testable in isolation; coverage gate easier to hit.
  - `lib/api.ts` keeps the `ok` / `fail` helpers but the route layer no
    longer constructs `fail` directly — it throws typed errors.
  - `tests/unit/errors.test.ts` covers every `AppError` subclass → response
    mapping.

### ADR-010: Release strategy (v0.2.0 alpha → beta → GA)

- **Status**: Accepted (2026-09-19)
- **Context**: v0.2.0 is a full rewrite from yarn workspaces + Express +
  Prisma + Loki to a single Next.js 14 app with Tailwind + shadcn/ui +
  Supabase + Drizzle. The previous release path was ad-hoc. Three release
  phases with explicit acceptance criteria give the team a gate before
  inviting users.
- **Decision**: Three-phase rollout, captured in `SPEC.md` §"Release
  strategy". v0.2.0-alpha (internal CRUD reach + auth + RLS + Sentry),
  v0.2.0-beta (Pixel's design pass + drag-drop weekly view + bullet journal
  - habits), v0.2.0-GA (Stripe + streaks + calendar sync + Lighthouse
    ≥ 90).
- **Consequences**:
  - Each phase has a Railway environment (`staging`, `beta`, `production`)
    and a smoke script in `scripts/smoke-<phase>.sh`.
  - The beta phase gates user invitations on a two-week staging soak
    without P0/P1 incidents.
  - The GA phase gates public launch on Lighthouse ≥ 90 on the landing
    page and on the weekly view.
  - Coverage gate (85%/75%) is enforced from beta onward; alpha is
    aspirational and gates only on smoke scripts.
  - The MrBrooks Admin Portal Sentry integration QA gate
    (`INTEGRATION.md` §"Verify after deploy") runs at every phase transition.

### ADR-011: Test-writer delegation for coverage

- **Status**: Accepted (2026-09-19)
- **Context**: `tests/unit/` currently contains two tests (`time-units.test.ts`,
  `validation.test.ts`). The 85%/75% coverage gate in `vitest.config.ts` is
  unreachable with this footprint. The owner has flagged that writing tests
  is not the implementation lane's job — coverage writing belongs to a
  specialist who can prioritize the high-leverage paths first.
- **Decision**: Tests are written by the `test-writer` subagent. The
  implementation lane produces code; the test lane produces tests. The
  dispatch pattern: after each PR lands a feature commit, dispatch
  `test-writer` with a digest of the changed files; it returns a list of
  test files to add.
- **Consequences**:
  - PRs do not gate on tests from the same agent that wrote the code.
  - `tests/` grows by file count, not by lines added inside a feature PR.
  - Coverage gate stays aspirational until the test suite is built up; the
    gate threshold itself is not changed.
  - Two test specs are pre-captured from the 2026-09-19 direction:
    1. **Env validation test** — `tests/unit/env.test.ts` imports the env
       module and asserts every required key is present at startup.
       Missing key → failing test. CI catches env drift before deploy.
    2. **Auth bypass test** — `tests/integration/auth-bypass.test.ts` for
       every protected route, fetches without a session cookie, asserts 401. Covers both server components (redirect) and route handlers
       (JSON 401).

### ADR-012: New repo at github.com/MrBrooksProds/LifeOS

- **Status**: Accepted (2026-09-19)
- **Context**: `~/repos/life-is-hard-planner/` carries the pre-rewrite
  yarn-workspace + Express + Prisma history on `main`. The new direction
  (Tailwind + shadcn + Supabase + custom errors) is a clean break from
  that history. Carrying the old commits forward is archaeology, not
  context.
- **Decision**: The new repo lives at
  `https://github.com/MrBrooksProds/LifeOS.git`. The pre-rewrite history
  is preserved in `life-is-hard-planner` for archaeology but is not the
  source of truth going forward.
- **Consequences**:
  - Initial commit to the new repo includes: `app/`, `db/`, `lib/`,
    `tests/`, `scripts/`, `docs/`, `drizzle.config.ts`, `instrumentation.ts`,
    `middleware.ts`, `next.config.mjs`, `railway.toml`, sentry configs,
    `tsconfig.json`, `vitest.config.ts`, `package.json`, `.env.example`,
    `.gitignore`, `README.md` — drawn from the rewrite WIP in
    `life-is-hard-planner`.
  - The uncommitted WIP in `life-is-hard-planner` is reviewed for
    reusable patterns before the new repo's first commit; the rest is
    discarded.
  - Future PRs target the new repo. `life-is-hard-planner` is read-only
    archaeology.

### ADR-013: Calendar UX patterns (Morgen, Google, Calendly, Fantastical)

- **Status**: Accepted (2026-09-19)
- **Context**: SPEC §v0.3.0-beta calls for a weekly grid drag-and-drop
  scheduler "the heart of the Big Rocks workflow" with three theme
  options (Linear-minimal, Notion-card, Apple-grid). We needed a
  ranked list of UX patterns from best-in-class calendar apps to
  inform the design.
- **Sources**: morgen.so, support.google.com/calendar, calendly.com,
  flexibits.com/fantastical. Full citations in the brain page
  `[[lifeos-calendar-ux-research-2026-09-19]]`.
- **Decision** (ranked by leverage for LifeOS):
  1. **Calendar Sets with toggleable left rail** (Morgen + Fantastical)
     — named, savable subsets of calendars the user can toggle.
     Persisted as `user_calendar_sets` rows keyed by `user_id`. UI:
     shadcn `DropdownMenu` + `CheckboxItem` rows in a sidebar.
  2. **Color-per-calendar everywhere** (Google) — the 11-color GCal
     palette as defaults; custom hex allowed. The color paints every
     event block, every task chip, every agenda entry, every DayTicker
     dot. Exposed as `--calendar-color` CSS variable on the row.
  3. **Click-empty-slot-to-create + natural-language quick add**
     (Google + Fantastical). Inline popover for click-create (start/end
     pre-filled from the click position); cmdk command palette for NL
     quick add. These two creation paths cover 95% of event creation.
  4. **Time-block tasks distinctly from events** (Morgen) — tasks on
     the grid render with dashed border, lower opacity, or hatched
     fill. They drag onto the grid just like events. This is the
     visual hook for "principles as time blocks."
  5. **DayTicker + six-view ladder** (Fantastical) — DayTicker is a
     horizontal scrollable strip of consecutive days above the main
     grid. The view ladder (Day/Week/Month/Quarter/Year) gives the user
     a zoom-out path that GCal lacks.
  6. **Buffer/break time auto-insert + daily limits per principle**
     (Calendly + Morgen). Configurable pre/post buffer per event type;
     hard cap per principle category surfaced as a `Progress` chip.
- **Patterns explicitly NOT adopted**:
  - AI-driven auto-scheduling (Morgen). Undermines user agency in a
    principles-based planner; recommendations stay visible and optional.
  - Public booking links (Calendly). Wrong shape for a private tool.
  - Gmail auto-event extraction (Google). Out of scope; false positives
    are a UX trap.
  - Apple-ecosystem-native feel (Fantastical). Web-first; Lock Screen
    widgets, Standby mode, Vision Pro layouts don't translate.
- **Consequences**:
  - SPEC §v0.3.0-beta Calendar UX section captures the ranked list with
    source citations.
  - Tailwind + shadcn component picks: `Tabs`, `DropdownMenu`, `Popover`,
    `Command` (cmdk), `ScrollArea`, `Card`, `Switch`, `Progress`.
  - Three themes via CSS variables (`app/calendar/themes/{linear,notion,apple}.css`),
    not component variants — Schedule-X exposes its visual surface
    through CSS classes, which we leverage.

### ADR-014: Calendar stack — Schedule-X + @dnd-kit + googleapis

- **Status**: Accepted (2026-09-19)
- **Context**: We surveyed calendar component libraries, drag-and-drop
  libraries, and provider integrations for a Next.js 14 + React 18 +
  Tailwind + shadcn stack. Full survey with bundle sizes, license,
  TypeScript support in the brain page
  `[[lifeos-calendar-stack-research-2026-09-19]]`.
- **Options considered**:
  - **Views**: FullCalendar (MIT core + commercial Premium for DnD),
    React Big Calendar (MIT, no built-in DnD), Schedule-X (MIT,
    modular), DayPilot Lite (Apache-2.0 Lite + commercial Pro),
    custom Tailwind grid.
  - **Drag-and-drop**: @dnd-kit, react-dnd, Pragmatic drag-and-drop
    (Atlassian).
  - **Google sync**: googleapis direct, Nylas (commercial),
    Cronofy (commercial).
  - **Multi-provider read**: Nylas, Cronofy, Cal.com v2 API.
  - **Time-zones**: date-fns-tz, Luxon, Day.js + plugins,
    Temporal (polyfill).
  - **Pickers**: shadcn/ui Calendar (react-day-picker v8+),
    react-datepicker.
- **Decision**:
  - **Views**: Schedule-X in alpha. MIT license, modular packages
    (`@schedule-x/calendar`, `@schedule-x/drag-and-drop`,
    `@schedule-x/event-modal`), native TS, decoupled CSS that doesn't
    fight Tailwind, active 2024-2025 development. Re-evaluate for v1.0
    once the three themes harden — a custom Tailwind grid is the
    long-term answer.
  - **Drag-and-drop**: **Override** Schedule-X's built-in DnD with
    @dnd-kit from day one. Schedule-X ships HTML5 DnD under the hood
    (no keyboard support); @dnd-kit's keyboard sensor + live-region
    announcements are the difference between an a11y-compliant
    Franklin-Covey tool and one that fails keyboard users.
  - **Google sync**: googleapis direct in alpha (Google only, free,
    well-typed, 1M queries/day quota). Nylas in beta when MS/iCloud
    enter scope. node-ical for ICS one-off imports.
  - **Time-zones**: date-fns + date-fns-tz. Plan a Temporal migration
    once stage 4 + Safari native ship (2026-2027).
  - **Pickers**: shadcn/ui Calendar (react-day-picker v8) + shadcn
    Combobox for time-of-day entry.
- **Risks captured**:
  - Schedule-X maturity (first public release 2023). Mitigation: vendor
    behind a thin wrapper; one-import swap later.
  - FullCalendar Premium lock-in ($480/dev/yr for DnD). Don't start
    there; the MIT tier is crippled for this use case.
  - Nylas vendor lock-in (pricing scales per user, changed tiers twice
    in three years). Keep googleapis calls behind a `CalendarProvider`
    interface; Nylas is a swap-in, not a load-bearing dep.
  - Cal.com AGPL on self-host is viral copyleft. Use the commercial v2
    API for embed flows, not AGPL.
  - @dnd-kit maintenance pace (6+ month gaps between releases). Pin
    core/sortable/utilities to specific versions.
  - Google API quota blowups (50k/100s/project). Exponential backoff,
    conditional GETs with ETags, per-user backoff.
- **Alpha / Beta / GA split**:
  - **v0.2.0-alpha**: Schedule-X week + day views (no month); @dnd-kit
    drag (override Schedule-X's built-in); shadcn Calendar + Combobox
    for creation; date-fns-tz; single-theme (Linear-minimal flat);
    googleapis Google Calendar read-only.
  - **v0.3.0-beta**: Add Notion-card and Apple-grid themes via CSS-var
    swap; Month + agenda views; Google Calendar write; ICS import;
    sync tokens + incremental sync.
  - **v0.4.0-GA**: Nylas aggregation for MS + iCloud; two-way write
    sync with last-write-wins conflict resolution; Reclaim.ai-style
    "smart suggestions" (own LLM); Temporal migration behind feature
    flag; Schedule-X vs custom-grid decision for v1.0.

### ADR-015: Calendar schema (events, calendars, sync_state, calendar_sets)

- **Status**: Accepted (2026-09-19)
- **Context**: The calendar feature needs new tables. The current schema
  (`db/schema.ts` + `0000_initial_schema.sql`) has `time_blocks` for our
  own blocks but no notion of external calendar events, calendar sets,
  sync state, or provider metadata.
- **Decision**: Add four tables (lands in `0002_calendar_schema.sql`):

  ```sql
  -- calendars: a "calendar" in the Morgen/Fantastical sense — a named
  -- source of events. May be user-local (manual), or a synced mirror
  -- of a Google Calendar.
  CREATE TABLE "calendars" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
    "name" text NOT NULL,
    "color" text DEFAULT '#6366f1' NOT NULL,
    "provider" text,         -- 'local' | 'google' | NULL
    "provider_id" text,      -- Google calendar id when synced
    "provider_etag" text,    -- last seen ETag for incremental sync
    "is_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );

  -- events: the unified event table. Source-of-truth for both local
  -- events and mirrored Google events. provider='local' rows are
  -- writable; provider='google' rows are read mirrors and pushes
  -- back to Google on edit.
  CREATE TABLE "events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
    "calendar_id" uuid NOT NULL REFERENCES "public"."calendars"("id") ON DELETE cascade,
    "title" text NOT NULL,
    "description" text,
    "location" text,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "timezone" text NOT NULL DEFAULT 'UTC',
    "is_all_day" boolean DEFAULT false NOT NULL,
    "is_task" boolean DEFAULT false NOT NULL,    -- true when event is a task-as-block
    "status" text DEFAULT 'CONFIRMED' NOT NULL,  -- CONFIRMED | TENTATIVE | CANCELLED
    "provider" text DEFAULT 'local' NOT NULL,
    "provider_id" text,                          -- Google event id when synced
    "provider_etag" text,                        -- last seen ETag
    "conference_url" text,                       -- auto-detected Zoom/Meet/Teams URL
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );

  -- sync_state: per-calendar incremental sync bookkeeping. Google uses
  -- syncToken; we cache last_synced_at for fallback. RLS applies.
  CREATE TABLE "sync_state" (
    "calendar_id" uuid PRIMARY KEY REFERENCES "public"."calendars"("id") ON DELETE cascade,
    "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
    "sync_token" text,
    "last_synced_at" timestamp with time zone,
    "next_sync_after" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );

  -- calendar_sets: named savable subsets of calendars. The user
  -- toggles visibility of calendars within a set; the active set
  -- determines what renders on the grid. Per-user.
  CREATE TABLE "calendar_sets" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
    "name" text NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,  -- exactly one set per user should be active
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );

  -- calendar_set_members: which calendars belong to each set.
  CREATE TABLE "calendar_set_members" (
    "set_id" uuid REFERENCES "public"."calendar_sets"("id") ON DELETE cascade,
    "calendar_id" uuid REFERENCES "public"."calendars"("id") ON DELETE cascade,
    "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
    "is_visible" boolean DEFAULT true NOT NULL,
    PRIMARY KEY ("set_id", "calendar_id")
  );
  ```

- **Consequences**:
  - Migration `0002_calendar_schema.sql` lands at the start of beta
    (v0.3.0-beta). Alpha ships without it.
  - RLS policies added to `0003_calendar_rls_policies.sql` (extends
    `0001_rls_policies.sql`).
  - `events.is_task` is the visual hook for "principles as time blocks"
    (ADR-013 pattern #4).
  - `calendar_sets.is_active` enforced by a Postgres trigger ensuring
    exactly one active set per user.
  - `provider_etag` + `sync_state.sync_token` enable incremental sync
    (Google's recommended pattern; avoids quota blowups).

### ADR-016: Calendar a11y — @dnd-kit keyboard-first, no HTML5 DnD

- **Status**: Accepted (2026-09-19)
- **Context**: The calendar grid is the central surface for Big Rocks
  scheduling. Franklin Covey users are keyboard-first planners. A
  drag-only UI fails those users.
- **Decision**: All drag-and-drop interactions on the calendar grid
  use `@dnd-kit` with its keyboard sensor enabled by default. No
  HTML5-native drag-and-drop anywhere in the calendar feature.
  Schedule-X's built-in DnD plugin is **not** used; events are
  rendered through Schedule-X but the drag interaction layer is
  custom on top.
- **Consequences**:
  - The `app/(portal)/calendar/` pages import `@dnd-kit/core`,
    `@dnd-kit/sortable`, and `@dnd-kit/utilities` directly.
  - A custom `DndContext` wraps the grid; events are draggable items
    inside a sortable calendar (time slots as droppable zones).
  - Live-region announcements on every drag event (default in
    `@dnd-kit`'s keyboard sensor).
  - Focus management: tab moves through events; arrow keys within an
    event moves it to adjacent slots.
  - Tested via `@testing-library/react` + `@testing-library/user-event`
    keyboard interactions.

### ADR-017: Calendar theme system (CSS variables, three themes)

- **Status**: Accepted (2026-09-19)
- **Context**: SPEC §v0.3.0-beta requires three user-selectable
  calendar themes: Linear-minimal (flat), Notion-card (rounded,
  elevated), Apple-grid (native feel). The themes affect the grid
  layout, event card shape, time axis, and DayTicker.
- **Decision**: CSS variables, not component variants. Three CSS files
  (`app/calendar/themes/{linear,notion,apple}.css`) define the same set
  of variables with theme-specific values. The active theme loads via
  a class on the calendar root element (`.theme-linear`,
  `.theme-notion`, `.theme-apple`) set by user preference in
  `user_settings.calendar_theme`.
- **Variable surface** (every theme must define):
  - `--calendar-grid-bg`, `--calendar-grid-line`, `--calendar-grid-today-bg`
  - `--calendar-event-bg`, `--calendar-event-fg`, `--calendar-event-border-radius`
  - `--calendar-event-shadow`, `--calendar-event-padding`
  - `--calendar-task-bg`, `--calendar-task-border-style`
  - `--calendar-time-axis-width`, `--calendar-time-axis-font-weight`
  - `--calendar-dayticker-height`, `--calendar-dayticker-day-width`
- **Consequences**:
  - Schedule-X's CSS classes can be overridden by the theme variables
    (no need to fork the lib).
  - Tailwind config maps the variables to its theme.extend so
    shadcn primitives (Card, Button, etc.) re-skin too.
  - A theme preview can be rendered server-side or client-side by
    swapping the class on the calendar root.
  - Adding a fourth theme is one new CSS file + one enum entry.

### ADR-018: Calendar library — react-big-calendar (supersedes ADR-014's views choice)

- **Status**: Accepted (2026-09-23)
- **Context**: ADR-014 chose Schedule-X for the v0.2.0-alpha calendar
  views. After three weeks of cross-project work, the developer is also
  building a calendar in a separate application using
  `react-big-calendar` (RBC). The shared developer wants a single
  calendar library across both apps so that decisions (theming,
  drag-and-drop overrides, resource columns, a11y patterns, custom
  toolbar) compound instead of being redone, and so that bugs and fixes
  in one project help the other.
- **Options re-considered** (vs. ADR-014):
  - **react-big-calendar** — MIT, ~8.7k stars, first-class `resources`
    prop for Calendar Sets, separate `react-big-calendar/lib/addons/
dragAndDrop` addon, ships its own compiled CSS that is styleable
    via `components` prop and Tailwind class overrides. Active
    maintenance (latest 1.19.x). Mature React 18 support.
  - **Schedule-X** (current) — MIT, modular packages, native TS, CSS
    designed to coexist with Tailwind. First public release 2023; the
    brain note on RBC vs Schedule-X captured Schedule-X's newer,
    less-battle-tested calendar grid as the trade-off we accepted.
  - **FullCalendar** — MIT core + commercial Premium for DnD
    ($480/dev/yr). Rejected in ADR-014.
- **Decision**: **react-big-calendar** for v0.3.0-beta onward. Keep
  `@dnd-kit` as the drag-and-drop layer (transfers from ADR-014 with
  no change — RBC ships with react-dnd-style HTML5 DnD in its addon,
  which we override just like we would have overridden Schedule-X's
  built-in DnD). Keep the CSS-variable theme system from ADR-017 — it
  is library-agnostic by design and applies unchanged.
- **Reasons (in priority order)**:
  1. **Cross-project consistency** — same library, same wrapper
     component, same drag-and-drop override pattern, same theme
     variable surface, same resource-column model. Decisions made in
     the sibling app transfer directly; bugs fixed in one fix both.
  2. **First-class resources** — RBC's `resources`/`resourceAccessor`
     props model Calendar Sets (ADR-013's #1 research finding) with
     zero custom plumbing. Schedule-X required a custom adapter for
     the same UX.
  3. **Mature battle-testing** — RBC has been in production since
     2015 across thousands of apps. The known limitations
     (no month-view keyboard nav out of the box, default styles need
     overriding) are well-documented and have known workarounds in
     the RBC community.
  4. **DnD addon, not built-in** — matches the ADR-016 a11y position:
     we own the drag layer via `@dnd-kit` rather than inheriting a
     library's HTML5-only DnD. Same shape as the override we would
     have written for Schedule-X.
- **What stays** (transferred from ADR-014 with no change):
  - `@dnd-kit` as the drag layer (ADR-016).
  - CSS-variable theme system with three themes (ADR-017).
  - googleapis for Google Calendar sync; Nylas swap-in for v0.4.0.
  - date-fns + date-fns-tz for time-zones.
  - shadcn/ui `Calendar` (react-day-picker v8) + `Combobox` for
    pickers and time-of-day entry.
- **What changes**:
  - Replace `@schedule-x/calendar`, `@schedule-x/drag-and-drop`,
    `@schedule-x/event-modal` with `react-big-calendar`,
    `react-big-calendar/lib/addons/dragAndDrop`, and
    `@types/react-big-calendar` (RBC 1.20.0 ships no bundled types,
    so the DefinitelyTyped package is required for TypeScript
    consumption).
  - The `<Calendar />` wrapper in `app/(portal)/calendar/` will mount
    RBC inside a custom shell that renders the left-rail Calendar
    Sets (`resources`) and routes RBC's `onSelectEvent` into the
    existing event-modal pattern.
  - The "vendor behind a thin wrapper" mitigation from ADR-014 stays
    in force. The wrapper is now `lib/calendar/rbc.tsx` and owns the
    localizer, default props, and theme-class injection.
- **What is deliberately _not_ changing**:
  - Theming model (CSS variables, three themes) — works against
    RBC's `components` prop and Tailwind class overrides.
  - The decision to defer the custom-Tailwind-grid rewrite — it
    still belongs at v1.0 once the three themes harden, regardless
    of which library is underneath the wrapper.
- **Honest caveats** (so future-us doesn't relitigate):
  - RBC's Tailwind story is "override the compiled CSS classes,"
    not "library ships Tailwind." Theming is more work than
    Schedule-X's CSS-var native support. ADR-017's variable surface
    absorbs this — we define the variables once, map them in
    `tailwind.config.ts`, and override RBC's class names in
    `app/calendar/rbc-overrides.css`.
  - RBC's default month view is keyboard-light. We will keep month
    view as read-only for v0.3.0-beta (click a date → open the
    day-view in a sheet), matching the v0.2.0-alpha scope reduction
    in ADR-014.
  - RBC maintenance pace is slower than Schedule-X (the 1.x line
    had long gaps). Pin a specific version; revisit at v1.0.
- **Migration plan**:
  1. `npm uninstall @schedule-x/{calendar,drag-and-drop,event-modal}`
  2. `npm install react-big-calendar@^1.19`
  3. Land `lib/calendar/rbc.tsx` wrapper with localizer + theme
     injection.
  4. Move `app/(portal)/calendar/` from the Schedule-X stub to the
     RBC wrapper.
  5. Smoke-test the three themes + a11y keyboard path.
  6. Update `docs/SPEC.md` §Calendar UX and any QA scripts that
     reference Schedule-X by name.
- **Consequences**:
  - ADR-014's Schedule-X-specific risks (immaturity, separate
    DnD plugin) are replaced by RBC-specific risks above.
  - Cross-project knowledge is now an asset: improvements to
    `lib/calendar/rbc.tsx` here can be lifted into the sibling
    app and vice versa.
  - ADR-017's CSS-variable contract becomes the load-bearing piece
    of theming — the RBC overrides file must consume every
    variable in the contract.

### ADR-019: RLS is now actually enforced (set_config + FORCE + auth-lookup)

- **Status**: Accepted (2026-09-23)
- **Context**: Three bugs shipped together in `f7d706e` (staging
  environment + user-select login) that silently disabled the
  defense-in-depth promised by ADR-008. They surfaced only when the
  calendar route started calling `withUserContext` against a real
  database and Postgres returned `syntax error at or near "$1"`. Once
  fixed, deeper inspection revealed that even when the GUC was set
  correctly, every query still returned every user's rows -- RLS was
  bypassed at two layers. The bugs are pre-existing in `f7d706e` but
  were masked by the fact that no route had ever successfully run
  `withUserContext` end-to-end before (login uses bare `db.select()`
  and pre-calendar portal routes had the same `SET LOCAL` bug).
- **The three bugs, ordered by discovery**:
  1. **`SET LOCAL app.user_id = ${userId}` rejects parameters.**
     `SET` is a Postgres utility command where parameter binding
     isn't valid grammar -- the driver correctly sends `$1` and
     Postgres correctly rejects it. Every call to `withUserContext`
     since `f7d706e` has thrown a Postgres error on its first line.
     Login worked by accident because `lib/auth.ts` uses bare
     `db.select()`, not `withUserContext`. Calendar was the first
     route to actually exercise the wrapper, which is what surfaced
     the failure to the user.
  2. **`lifeos` role was a superuser.** The `postgres:16` Docker
     image creates `POSTGRES_USER` as a superuser by default. Even
     if bug #1 were fixed, superusers bypass every row-level
     security policy. The policies added in `0001_rls_policies.sql`
     were silently inert. Verified by `SELECT current_setting
('is_superuser') = 'on'` against the local container.
  3. **Table owner bypasses RLS without `FORCE`.** After demoting
     `lifeos` to `NOSUPERUSER NOBYPASSRLS`, RLS still wasn't
     enforcing -- because `lifeos` owns all the tables and
     Postgres's owner-bypass rule applies unless the table has
     `ALTER TABLE ... FORCE ROW LEVEL SECURITY`. Documented at
     https://www.postgresql.org/docs/current/ddl-rowsecurity.html.
- **Auth-bootstrap problem**: with all three fixed, the credentials
  provider's "look up user by email" query stops finding the row --
  the policy requires `app.user_id` to be set, but we don't know
  the user_id yet. Standard fix: a second narrowly-scoped policy
  that permits a single-row SELECT when `app.auth_email_lookup`
  equals the target email. The GUC is set only inside the
  credentials provider's transaction, never on any other code path.
- **Decision**:
  - **Bug #1**: replace `tx.execute(sql\`SET LOCAL app.user_id =
    ${userId}\`)` with `tx.execute(sql\`SELECT set_config
    ('app.user_id', ${userId}, true)\`)`. `set_config`is a regular
function call so parameter binding works; the third argument`true`makes the setting transaction-local, matching`SET LOCAL`
    intent.
  - **Bug #2**: create the `lifeos` role without superuser at
    container init time. `scripts/local-up.sh` now starts the
    container with `POSTGRES_USER=postgres` (the real superuser)
    once, then runs `scripts/init-nosuperuser.sql` via the
    container's built-in `postgres` OS user to create the
    `lifeos` role as `NOSUPERUSER NOBYPASSRLS CREATEDB
CREATEROLE` and grant ownership of the `lifeos` database.
    The role retains `CREATEDB` + `CREATEROLE` so `db:generate` +
    `db:migrate` continue to work on a fresh container.
  - **Bug #3**: new migration `0002_force_row_level_security.sql`
    applies `ALTER TABLE ... FORCE ROW LEVEL SECURITY` to every
    user-owned table (users, roles, values, goals, tasks,
    time_blocks). Idempotent.
  - **Auth-bootstrap fix**: same migration adds a `FOR SELECT`
    policy `auth_email_lookup` on `users`:
    `USING (email = current_setting('app.auth_email_lookup', true))`.
    `lib/auth.ts` opens a transaction, sets the GUC, queries,
    unsets via COMMIT. The 60-day trial downgrade in the `signIn`
    event now also runs inside a transaction with `app.user_id`
    set, instead of as a bare update that would be blocked by RLS.
  - **Pre-existing policy expressions in `0001_rls_policies.sql`
    also need a NULLIF guard.** The original expression was
    `id = current_setting('app.user_id', true)::uuid`. With FORCE
    RLS, the policy runs against every query, including the
    auth-bootstrap path where `app.user_id` is intentionally unset
    and only `app.auth_email_lookup` is set. `current_setting(..., true)`
    returns an empty string when the GUC is unset; `''::uuid` raises
    `invalid input syntax for type uuid: ""` (a hard error, not a
    false match). The fix is `NULLIF(current_setting(..., true), '')::uuid`,
    which returns NULL when the GUC is unset, and `id = NULL` is
    always false. Applied to every user-owned table in
    `0001_rls_policies.sql`.
- **What does NOT change**:
  - The `withUserContext` API surface (callers don't change).
  - `app.user_id` is still the GUC that gates per-row isolation.
- **Consequences**:
  - Every existing portal route and API route now works under
    enforced RLS (verified end-to-end with `curl` on /, /goals,
    /tasks, /time-blocks, /roles, /values, /calendar -- all 200).
  - Local dev bring-up now requires the container to start with
    a real superuser so it can create `lifeos` without superuser.
    `scripts/local-up.sh` handles this; subsequent `docker start`
    calls skip the SQL since the role already exists.
  - If a future migration needs `CREATE ROLE`, it must be run
    with a superuser connection (e.g., `docker exec -u postgres
lifeos-db psql`).
- **Verification** (all pass against the local container):
  - `set_config` round-trip via `current_setting('app.user_id')`.
  - RLS filters: fake user_id returns 0 rows on `users`.
  - RLS passes: real user_id returns the matching row on `users`.
