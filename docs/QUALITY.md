# Quality Policy

Applies to LifeOS — and (ideally) every project under the `larspage` GitHub org.
Mirrors the MrBrooks Admin Portal standard (`~/repos/MrBrooks Admin Portal/docs/QUALITY.md`).
The MrBrooks file is the canonical reference; this file records the local
copy with any LifeOS-specific deltas called out in §"Local deltas" below.

## Required gates (CI must pass before merge)

| Gate                   | Tool                         | Threshold                                                |
| ---------------------- | ---------------------------- | -------------------------------------------------------- |
| Typecheck              | `tsc --noEmit`               | zero errors, strict mode on + `noUncheckedIndexedAccess` |
| Lint                   | `next lint --max-warnings 0` | zero warnings                                            |
| Unit/integration tests | `vitest run`                 | all passing                                              |
| Coverage (lines)       | vitest --coverage with v8    | **≥ 85%**                                                |
| Coverage (branches)    | vitest --coverage with v8    | **≥ 75%**                                                |
| Build                  | `next build`                 | success                                                  |
| Secret scan            | gitleaks                     | zero findings                                            |

The thresholds are enforced in `vitest.config.ts` `coverage.thresholds`
(CI fails on `vitest run --coverage` if any threshold is missed).

## Coverage scope

- **Critical paths (must be covered)**: route handlers (auth gate, request
  validation, query construction), Drizzle queries (insert/select/update/
  delete with `userId` filter), portal SDK init paths (`instrumentation.ts`).
- **Best-effort**: UI components, formatting, type-only files. Coverage on
  these is excluded from the gate via vitest `include`/`exclude` patterns.

## Coding standards

- TypeScript strict (`"strict": true`, `"noUncheckedIndexedAccess": true`)
- No `any` without a justifying `// eslint-disable-next-line` comment
- Functions ≤ 50 lines; files ≤ 400 lines (ESLint-enforced via project
  ESLint configuration; loose threshold for page files where Tailwind class
  lists or `style={{...}}` blocks pad the line count)
- All public functions have at least one test
- All DB schema changes require a migration **and** a down-migration note
- No new dependencies without an ADR in `docs/ARCHITECTURE.md`
- Conventional commits; PRs require a GitHub issue link (`Closes #NNN` or
  `Refs #NNN`)

## Release gates

- All quality gates pass (`npm run ci` exits 0)
- One approver (repo owner)
- No `TODO` without an issue reference in the same PR

## Local deltas

- The LifeOS app is end-user-facing only — there is no ingest pipeline, no
  alert dispatcher, and no worker service in this repo. The portal
  integration QA gate (development-standards §A) still applies: a deliberate
  error from a non-dev env must reach `portal.mrbrooks.biz` within 30 seconds.
  See [`INTEGRATION.md`](INTEGRATION.md) for the verify recipe.

- The `Per-repo adoption checklist` is delegated to `INTEGRATION.md` rather
  than duplicated here, since this is the only project repo in this initial
  rewrite.

## Why these numbers

- 85% line / 75% branch is the floor for a system you'll trust to wake you
  at 3am. Same reasoning as MrBrooks's `QUALITY.md`.

## Exceptions

- Coverage may dip 5pp on a single PR if a follow-up issue is opened in the
  same PR to restore it (enforced via PR template).
- The "no new deps without ADR" rule has a hot-fix escape hatch in
  `RUNBOOK.md`.
