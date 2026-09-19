# Runbook

Operational procedures for LifeOS. Read this end-to-end on first touch with
the production environment; use the §"Rotation", §"Ingest" or §"Database"
sections when a specific operation comes up.

## Rotation

### Rotate `NEXTAUTH_SECRET`

1. Generate a new secret: `openssl rand -base64 32`
2. Update `NEXTAUTH_SECRET` in the Railway service
3. All active sessions invalidate. Users must sign in again.

### Rotate GitHub OAuth client secret

GitHub OAuth apps are owned by `larspage` (personal). Use
`https://github.com/settings/applications` (not an org).

1. Open the LifeOS OAuth app (`https://github.com/settings/applications/<id>`)
2. Click **Generate a new client secret**
3. Copy the secret — GitHub shows it once
4. Update `GITHUB_SECRET` in Railway
5. Confirm the deploy rolls through with the new variable

### Rotate `MR_BROOKS_DSN` (portal API key)

The portal's "Rotate API key" button is the canonical path; see
[`MrBrooks Admin Portal/docs/RUNBOOK.md`](../../MrBrooks%20Admin%20Portal/docs/RUNBOOK.md)
§"Rotate API key for a project" for the full recipe. After rotating:

1. Update `MR_BROOKS_DSN` and `NEXT_PUBLIC_MR_BROOKS_DSN` in Railway.
2. Wait for the deploy to settle (`railway status`).
3. Trigger a deliberate error from staging and confirm it lands in the
   portal within 30 seconds (see `INTEGRATION.md` §"Verify after deploy").

## Database

### Run a migration locally

```bash
export DATABASE_URL=postgres://lifeos:lifeos@localhost:5433/lifeos
npm run db:migrate
```

This runs `drizzle-kit migrate` which applies any pending migrations from
`db/migrations/`. The current migration is `0000_initial_schema.sql`
(baseline) — the rewrite's initial schema. Per ADR-008, RLS policies land
in a follow-up migration (`0001_rls_policies.sql`); this file is plain
schema with no policies yet.

### Generate a new migration

```bash
export DATABASE_URL=postgres://lifeos:lifeos@localhost:5433/lifeos
npm run db:generate
```

This produces a new SQL file in `db/migrations/`. Add the equivalent
down-migration note as a SQL comment block at the bottom of the file
(per `QUALITY.md` §"Coding standards": every migration requires a
down-migration note). Review the generated SQL before committing — drizzle-kit
gets the order right, but the down comment is yours.

### Connect to production Postgres

The Railway-managed Postgres service exposes `DATABASE_URL` as a shared
variable. Use:

```bash
railway variables --service web --kv | grep DATABASE_URL
```

Or connect via the Railway dashboard → Postgres service → Data tab.

### Restore from backup

Railway takes daily Postgres backups by default. Restore via the Railway
dashboard → Postgres service → Backups tab → Restore on a chosen snapshot.

## Local dev

### Start the dev stack

```bash
npm run local:up
```

This starts a Postgres 16 container on port `5433` (Larry's local port
allocation per development-standards §H — `5432` collides with system
Postgres on Fedora). The script prints the `DATABASE_URL` to use.

### Apply migrations and seed

```bash
export DATABASE_URL=postgres://lifeos:lifeos@localhost:5433/lifeos
npm run db:migrate
npm run seed  # not implemented in v0.2.0
```

### Tear down

```bash
npm run local:down    # stop containers
npm run local:reset   # stop + delete volumes
```

`local:reset` is the right choice when schema changes need a clean slate.

### Run dev server

```bash
npm run dev
```

This starts `next dev` on port 3042 (MrBrooks uses 3002; this is a
different port to avoid collisions on machines that host both).

## Scaling

LifeOS is a single-user-per-account app. There is no horizontal scaling
pattern for the web service beyond Railway's standard replica count. If
the database becomes the bottleneck, scale Postgres to the next Railway
plan tier; the schema has no rows-per-user explosion (most users have
<1000 tasks, <100 goals).

## Contacts

- Owner: @larry
- GitHub: https://github.com/larspage/life-is-hard-planner/issues
- Portal: https://portal.mrbrooks.biz

## See also

- [`QUALITY.md`](QUALITY.md) — coding standards and gates
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — components, ADRs, data flow
- [`INTEGRATION.md`](INTEGRATION.md) — portal SDK install + verify recipe
- [`SPEC.md`](SPEC.md) — what the app does, deferred features
