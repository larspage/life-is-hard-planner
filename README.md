# LifeOS — Principle-based planning

A planning and execution system built on the Franklin Covey methodology
plus bullet journaling. Identity Layer → Tasks → Time Blocks, all anchored
to roles and goals. Big Rocks first.

## Stack

Single Next.js 14 app at the repo root. Drizzle ORM on Postgres for
persistence. NextAuth for GitHub OAuth + dev-credentials login. Errors
flow to the MrBrooks Admin Portal via the Sentry-compatible envelope.
CSS Modules + `app/globals.css` for the visual layer (single light
theme, hand-rolled tokens).

| Layer           | Choice                                         | Where to look                      |
| --------------- | ---------------------------------------------- | ---------------------------------- |
| App framework   | Next.js 14 (App Router)                        | `app/`                             |
| Language        | TypeScript strict + `noUncheckedIndexedAccess` | `tsconfig.json`                    |
| ORM             | Drizzle ORM                                    | `db/schema.ts`                     |
| Auth            | NextAuth v4                                    | `lib/auth.ts`                      |
| UI              | CSS Modules + globals tokens                   | `app/globals.css` + `*.module.css` |
| Tests           | vitest (85% / 75% coverage gate)               | `vitest.config.ts`, `tests/`       |
| Error telemetry | @sentry/nextjs → MrBrooks Portal               | `docs/INTEGRATION.md`              |
| Deploy          | Railway (single web service)                   | `railway.toml`                     |

Canonical MrBrooks family reference: `~/repos/MrBrooks Admin Portal/`.

## Layout

```
.
├── app/                     # App Router pages + route handlers
│   ├── (auth)/login/        # /login — minimal auth-only layout
│   ├── (portal)/            # /(portal) — auth-gated, with nav
│   │   ├── page.tsx         # / (dashboard)
│   │   ├── goals/           # /goals
│   │   ├── tasks/           # /tasks
│   │   └── time-blocks/     # /time-blocks
│   ├── api/                 # REST route handlers
│   │   ├── auth/[...nextauth]/
│   │   ├── health/
│   │   ├── roles/, roles/[id]/
│   │   ├── values/, values/[id]/
│   │   ├── goals/, goals/[id]/
│   │   ├── tasks/, tasks/[id]/
│   │   └── time-blocks/, time-blocks/[id]/
│   ├── error.tsx
│   ├── global-error.tsx
│   ├── globals.css
│   └── layout.tsx
├── db/                      # Drizzle schema + migrations
│   ├── schema.ts
│   ├── index.ts             # lazy Drizzle client (postgres-js)
│   └── migrations/
├── lib/                     # Shared server-side code
│   ├── api.ts               # Response helpers
│   ├── auth.ts              # NextAuth config + requireUserId()
│   ├── time-units.ts        # Task size + time helpers
│   └── validation.ts        # zod schemas for API bodies
├── tests/
├── scripts/                 # local-up.sh, local-down.sh, local-reset.sh
├── docs/                    # QUALITY / ARCHITECTURE / INTEGRATION / RUNBOOK / SPEC
├── sentry.{client,server,edge}.config.ts
├── instrumentation.ts
├── middleware.ts            # NextAuth matcher (/(portal)/)
├── drizzle.config.ts
├── vitest.config.ts
├── next.config.mjs
├── tsconfig.json
├── railway.toml
└── package.json
```

## Getting started

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# Edit .env.local — at minimum DATABASE_URL and NEXTAUTH_SECRET.

# 3. Start Postgres
npm run local:up

# 4. Apply migrations
export DATABASE_URL=postgres://lifeos:lifeos@localhost:5433/lifeos
npm run db:migrate

# 5. Run dev server
npm run dev
# → http://localhost:3042
```

In dev, `ENABLE_CREDENTIALS_PROVIDER=true` lets you sign in with seed
credentials via `POST /api/auth/callback/credentials`. The seed users
land via `npm run seed` (not implemented in v0.2.0; create one manually
in Postgres to bootstrap).

## Quality gates

Per `docs/QUALITY.md` and `docs/RUNBOOK.md`:

```bash
npm run typecheck    # zero errors with strict + noUncheckedIndexedAccess
npm run lint         # next lint --max-warnings 0
npm run test         # vitest run
npm run test:coverage  # 85% line / 75% branch gate enforced
npm run ci           # all three
```

The `npm run ci` script is what CI runs on every PR. Coverage thresholds
are baked into `vitest.config.ts` so a dip immediately fails the run.

## Documentation

- **Quality** — `docs/QUALITY.md`
- **Architecture + ADRs** — `docs/ARCHITECTURE.md`
- **Portal SDK integration** — `docs/INTEGRATION.md`
- **Operational procedures** — `docs/RUNBOOK.md`
- **Product spec (what / why)** — `docs/SPEC.md`

## Brain

Planning + project context lives in the Logseq brain at
`~/brain-logseq/`. Relevant pages:

- `[[project-life-is-hard-planner]]` — project stub, current status
- `[[lifeos-philosophy-and-differentiation]]` — Core Philosophy +
  Differentiation (5 + 4 claims)
- `[[lifeos-roadmap-2026-09-15-snapshot]]` — absorbed MVP/Phase 2/Phase 3
  with rewrite-survival annotations
- `[[state-archive-life-is-hard-planner-2026-08-05]]` — historical
  archive of the pre-rewrite `STATE/` directory

## License

MIT
