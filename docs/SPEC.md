# LifeOS — A principle-based planning & execution system

## Overview

LifeOS is a multi-layered planning and execution app inspired by:

- Franklin Covey's principle-centered system (roles, goals, quadrants, Big Rocks)
- Bullet journaling (flexibility, reflection, creativity)
- Modern productivity tooling (task management, calendars, integrations)

The goal is to help users:

- Align daily actions with long-term values
- Plan effectively across life horizons (year → month → week → day)
- Feel a strong sense of progress and accomplishment
- Customize their system to match their thinking style (analytical ↔ creative)

This document captures the **what** and **why** of LifeOS. The **how** lives
in [`ARCHITECTURE.md`](ARCHITECTURE.md); the **quality bars** in
[`QUALITY.md`](QUALITY.md); the **portal SDK wiring** in
[`INTEGRATION.md`](INTEGRATION.md); the **operational procedures** in
[`RUNBOOK.md`](RUNBOOK.md).

## Core philosophy

Five principles govern every feature decision:

1. **Principle alignment** — users define roles, values, vision/goals.
   These become the anchor layer for all planning.
2. **Big rocks first** — Quadrant II (important, not urgent) tasks get
   scheduled first; reactive work is the overflow.
3. **Multi-horizon planning** — yearly → monthly → weekly → daily cascade.
   Weekly planning is the central control point.
4. **Reflection & awareness** — daily logs and weekly reviews surface
   patterns over time.
5. **Emotional reward loop** — completion should feel satisfying. Visual
   and behavioral feedback reinforces progress.

See `[[lifeos-philosophy-and-differentiation]]` in the brain for the full
phrasing with confidence annotations.

## Scope

### v0.2.0 — current rewrite

The 2026-09-15 rewrite brought LifeOS onto the canonical MrBrooks stack
(single Next.js 14 app, Drizzle, NextAuth, portal SDK). v0.2.0 ships:

**In scope** (UI + API + schema):

- **Identity Layer** — Roles, Values, Goals CRUD (server-only UI; full
  REST API ready)
- **Task System** — Tasks CRUD with quadrant, role, goal linking,
  self-referential subtasks
- **Time Blocks** — Calendar-blocked tasks with start/end/date
- **Auth** — NextAuth v4 (GitHub OAuth in production, dev
  credentials provider gated by `ENABLE_CREDENTIALS_PROVIDER=true`)
- **Portal SDK** — Errors and traces flow to the MrBrooks Admin Portal
  via `@sentry/nextjs`
- **Token system** — CSS Modules + `app/globals.css` for a single light
  theme (per ADR-006)

**Deferred to v0.3.0+** (schema present, UI/API behind the scenes):

- Subscription tiers (free/trial/premium)
- File uploads
- Habit tracking
- Bullet-journal daily log
- Drag-and-drop weekly view
- Role balance visualization
- Streak tracking

The schema (`db/schema.ts`) declares every column the deferred features
will need, so re-enabling them is a UI + API task rather than a schema
migration. See ADR-007 for the rationale.

### v0.3.0 — planned

- Weekly grid drag-and-drop scheduler (the heart of the Big Rocks workflow)
  with multiple style themes (Linear-minimal, Notion-card, Apple-grid) —
  per-user selection in settings
- Daily timeline view with bullet-journal log
- Streak tracking across daily + weekly planning actions
- Role balance chart on the weekly view
- Habit tracker templates
- Stripe integration for premium tier

## Release strategy

v0.2.0 is a full rewrite — yarn workspaces + Express + Prisma + Loki gone;
single Next.js 14 app, Tailwind + shadcn/ui, Supabase Postgres with RLS,
custom error hierarchy. Three phases, each with explicit acceptance gates.
Captured as ADR-010 in ARCHITECTURE.md; this section is the user-facing
summary.

**v0.2.0-alpha — internal.** CRUD reach across roles, values, goals, tasks,
time-blocks. NextAuth GitHub OAuth works in production; dev credentials
provider works locally. RLS policies block cross-user reads at the database
layer (defense-in-depth on top of `requireUserId()`). Sentry captures errors
to the MrBrooks Admin Portal. UI is functional, not pretty. Coverage gate is
aspirational — test-writer will deliver the full suite before beta.

**v0.2.0-beta — invited users.** Pixel applies a Volt design language via
shadcn/ui's CSS-variable theming. Drag-and-drop weekly view lands.
Bullet-journal daily log capture. Habit tracker templates. Coverage gate
(85%/75%) enforced in CI. Integration tests cover auth, RBAC, and RLS paths.
Two-week staging soak with no P0/P1 incidents required before invitations
open.

**v0.2.0-GA — public.** Stripe integration for premium tier. Streak tracking
across daily + weekly planning. Role balance visualization. External calendar
sync (Google, Cal.com). Lighthouse score ≥ 90 on the landing page and the
weekly view. SLA on Sentry alerts (portal dashboards set up at
`portal.mrbrooks.biz`).

The alpha deploys to a Railway staging environment first. Each phase
requires the previous phase's acceptance gate to be met before the next
phase begins. The MrBrooks Admin Portal Sentry integration QA gate
(INTEGRATION.md §"Verify after deploy") applies at every phase transition.

## Tech stack (v0.2.0)

| Layer           | Choice                                         | Why                                                                                     |
| --------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| Framework       | Next.js 14 (App Router)                        | Single app covers UI + API; server components reduce client JS                          |
| Language        | TypeScript strict + `noUncheckedIndexedAccess` | Per development-standards §A                                                            |
| Database        | Supabase Postgres 16                           | Managed Postgres with first-class Row-Level Security; matches NJDSS canonical (ADR-008) |
| Query builder   | Drizzle ORM                                    | Schema-as-TS, migrations-as-SQL; queries against Supabase Postgres (ADR-002)            |
| Auth            | NextAuth v4                                    | Owns JWT/CSRF/OAuth; dev credentials provider per ADR-004                               |
| UI primitives   | Tailwind 3 + shadcn/ui                         | End-user app needs richer surface; Pixel applies a Volt design language (ADR-006.b)     |
| Tests           | vitest                                         | Same runner as MrBrooks canonical; 85%/75% coverage gate enforced in `vitest.config.ts` |
| Error telemetry | @sentry/nextjs → MrBrooks Portal               | One place for every project's errors (ADR-005)                                          |
| Errors (app)    | Custom `AppError` class hierarchy              | `errorToResponse(err)` mapper replaces `throw new Response(...)` (ADR-009)              |
| Deploy          | Railway (single web service)                   | Single-app topology, no worker needed (ADR-001)                                         |

## Data model summary

Full Drizzle schema at `db/schema.ts`; initial SQL migration at
`db/migrations/0000_initial_schema.sql`. Tables:

```
users
  └─ roles
  └─ values
  └─ goals ───┐
              └─ tasks ───┐
                          ├─ time_blocks
                          └─ tasks (subtasks, self-referential)
  └─ habits ─── habit_logs
  └─ journal_entries ─── file_uploads
```

All user-owned tables (`roles`, `values`, `goals`, `tasks`, `time_blocks`,
`habits`, `habit_logs`, `journal_entries`, `file_uploads`) carry a
`user_id` column with `ON DELETE CASCADE`. Every API route filters by
`user_id` before reading or writing; defense-in-depth via the
`requireUserId()` helper in `lib/auth.ts`.

## MVP planning flow (v0.2.0 capability surface)

The MVP is a CRUD-reach app: roles, values, goals, tasks, and time-blocks
are usable end-to-end, but the **front-end experience** is the simplest one
that lets the data round-trip:

1. Define your roles (Parent, Engineer, Self, etc.)
2. Attach values and goals to roles
3. Create tasks with quadrant, role, goal links
4. Schedule time blocks for tasks
5. Tick tasks as complete

What v0.2.0 does **not** ship (planned for v0.3.0+):

- A drag-and-drop weekly view
- A daily timeline rendering
- Bullet-journal daily log capture
- Habit tracking
- Subscription billing

Until those land, the existing planning workflow is accessible but
text-first: form submissions on `/goals`, `/tasks`, `/time-blocks`, plus
the REST API under `app/api/`.

## Differentiation

What LifeOS does that the existing productivity-app market doesn't:

1. **Principle-based planning** — built on meaning, not just tasks
2. **Big Rocks first (native)** — core workflow, not an add-on
3. **Bullet journal + structure hybrid** — flexible + powerful
4. **Emotional UX** — designed to feel rewarding and motivating

These four points survive the rewrite unchanged. See
`[[lifeos-philosophy-and-differentiation]]` in the brain for the longer
phrasing.

## Future vision (post v0.3.0)

- AI-assisted planning suggestions (auto-prioritize Quadrant II tasks for
  upcoming week)
- Predictive scheduling (suggest time blocks based on historical
  completion patterns)
- External calendar sync (Google, Cal.com)
- Custom dashboard layouts
- Mobile companion app
- Analytics

## Final thought

Most productivity tools optimize for speed. LifeOS optimizes for:

- clarity
- intentionality
- alignment

That is the opportunity.
