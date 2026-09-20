# LifeOS — Principle-based planning

A planning and execution system built on the Franklin Covey methodology
plus bullet journaling. Identity Layer → Tasks → Time Blocks, all anchored
to roles and goals. Big Rocks first.

## Stack

Single Next.js 14 app at the repo root. **Supabase Postgres** for
persistence with **Row-Level Security** as the tenant-isolation safety
net. **Drizzle** as the schema-as-TS query builder. **NextAuth** for
GitHub OAuth + dev-credentials login. Errors flow to the MrBrooks Admin
Portal via the Sentry-compatible envelope. **Tailwind 3 + shadcn/ui**
primitives for the visual layer (single light theme in alpha; the Volt
brand pass lands in beta).

| Layer           | Choice                                         | Where to look                               |
| --------------- | ---------------------------------------------- | ------------------------------------------- |
| App framework   | Next.js 14 (App Router)                        | `app/`                                      |
| Language        | TypeScript strict + `noUncheckedIndexedAccess` | `tsconfig.json`                             |
| Database        | Supabase Postgres 16                           | (managed; `DATABASE_URL` in `.env.example`) |
| Query builder   | Drizzle ORM                                    | `db/schema.ts`, `db/index.ts`               |
| Row-Level Sec.  | Per-table policies + `app.user_id` GUC         | `db/migrations/0001_rls_policies.sql`       |
| Auth            | NextAuth v4 (GitHub OAuth + dev credentials)   | `lib/auth.ts`                               |
| Errors          | Typed `AppError` hierarchy (RFC 9110)          | `lib/errors.ts`                             |
| UI              | Tailwind 3 + shadcn/ui primitives              | `tailwind.config.ts`, `app/_components/ui/` |
| Tests           | vitest (85% / 75% coverage gate)               | `vitest.config.ts`, `tests/`                |
| Error telemetry | @sentry/nextjs → MrBrooks Portal               | `docs/INTEGRATION.md`                       |
| Deploy          | Railway (single web service)                   | `railway.toml`                              |

Canonical MrBrooks family reference: `~/repos/MrBrooks Admin Portal/`.

## Layout

```
.
├── app/                     # App Router pages + route handlers
│   ├── (auth)/login/        # /login — minimal auth-only layout
│   ├── (portal)/            # /(portal) — auth-gated, with nav
│   │   ├── page.tsx         # / (dashboard)
│   │   ├── roles/           # /roles
│   │   ├── values/          # /values
│   │   ├── goals/           # /goals
│   │   ├── tasks/           # /tasks
│   │   └── time-blocks/     # /time-blocks
│   ├── _components/ui/      # shadcn primitives (button, card, input, ...)
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
│   ├── globals.css          # Tailwind + design tokens
│   └── layout.tsx
├── db/                      # Drizzle schema + migrations
│   ├── schema.ts
│   ├── index.ts             # lazy Drizzle client + withUserContext()
│   └── migrations/
│       ├── 0000_initial_schema.sql
│       └── 0001_rls_policies.sql
├── lib/                     # Shared server-side code
│   ├── api.ts               # Response helpers (ok, fail)
│   ├── auth.ts              # NextAuth config + requireUserId()
│   ├── env.ts               # zod-validated env (fails fast at startup)
│   ├── errors.ts            # AppError hierarchy + errorToResponse mapper
│   ├── time-units.ts        # Task size + time helpers
│   ├── utils.ts             # cn() for shadcn
│   └── validation.ts        # zod schemas for API bodies
├── tests/
│   ├── setup.ts
│   ├── unit/                # errors, env, time-units, validation
│   └── integration/         # auth-bypass
├── scripts/
│   ├── local-up.sh          # Postgres container (port 5433)
│   ├── local-down.sh
│   ├── local-reset.sh
│   └── smoke-alpha.sh       # alpha acceptance gate (ADR-010)
├── docs/                    # QUALITY / ARCHITECTURE / INTEGRATION / RUNBOOK / SPEC
├── tailwind.config.ts
├── postcss.config.js
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
# Edit .env.local — at minimum DATABASE_URL, NEXTAUTH_SECRET.

# 3. Start Postgres (local dev only; Supabase handles prod)
npm run local:up

# 4. Apply migrations
export DATABASE_URL=postgres://lifeos:lifeos@localhost:5433/lifeos
npm run db:migrate

# 5. Run dev server
npm run dev
# → http://localhost:3042
```

In dev, `ENABLE_CREDENTIALS_PROVIDER=true` lets you sign in via the
NextAuth credentials provider. The seed script (`npm run seed`) is a stub
in v0.2.0-alpha — create one user manually in Postgres to bootstrap:

```sql
INSERT INTO users (id, email, password_hash, subscription_tier)
VALUES (
  gen_random_uuid(),
  'larry@lifeos.app',
  -- bcrypt hash of 'change-me' with 10 rounds
  '$2a$10$...',
  'TRIAL'
);
```

## Quality gates

Per `docs/QUALITY.md` and `docs/RUNBOOK.md`:

```bash
npm run typecheck    # zero errors with strict + noUncheckedIndexedAccess
npm run lint         # next lint --max-warnings 0
npm run test         # vitest run (72 tests across 5 files)
npm run test:coverage  # 85% line / 75% branch gate enforced
npm run smoke:alpha  # alpha acceptance gate per ADR-010
npm run ci           # all three
```

The `npm run ci` script is what CI runs on every PR. Coverage thresholds
are baked into `vitest.config.ts` so a dip immediately fails the run.

## Release strategy

Three phases per `SPEC.md §Release strategy` and `ADR-010`:

- **v0.2.0-alpha** (current) — CRUD reach across roles, values, goals,
  tasks, time-blocks. RLS + Sentry + custom errors wired.
- **v0.2.0-beta** — Pixel's Volt design pass + drag-drop weekly view +
  bullet journal + habits. Coverage gate enforced.
- **v0.2.0-GA** — Stripe + streaks + calendar sync + Lighthouse ≥ 90.

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
