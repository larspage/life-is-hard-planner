# LifeOS — Changelog

> Project state changes, per Moe methodology

---

- 2026-04-21T00:00:00Z [setup]: Project initialized with Next.js + Express + Prisma
- 2026-04-21T00:00:00Z [setup]: PostgreSQL schema pushed to database
- 2026-04-21T00:00:00Z [setup]: Logging infrastructure (Loki + Grafana) verified working
- 2026-04-21T00:00:00Z [setup]: GitHub repo created under larspage
- 2026-04-21T00:00:00Z [fix]: Prisma client generation fixed
- 2026-04-21T00:00:00Z [fix]: Winston logger custom levels fixed
- 2026-04-21T00:00:00Z [verify]: API starts, logs flow to Loki
- 2026-04-21T00:00:00Z [fix]: Added Moe STATE files (CHANGELOG, MAILBOX, TODO) - was missing from initial setup
- 2026-04-21T00:00:00Z [add]: Auth middleware (authenticate, optionalAuth)
- 2026-04-21T00:00:00Z [add]: Roles CRUD API with auth protection
- 2026-04-21T00:00:00Z [add]: Values CRUD API with auth protection
- 2026-04-21T00:00:00Z [add]: Goals CRUD API with auth protection
- 2026-04-21T00:00:00Z [add]: Tasks CRUD + split/migrate with auth protection
- 2026-04-21T00:00:00Z [add]: TimeBlocks CRUD with auth protection
- 2026-04-21T00:00:00Z [add]: Theme system with 6 themes (default, forest, ocean, sunset, midnight, lavender)
- 2026-04-21T00:00:00Z [add]: Theme selector component
- 2026-04-21T00:00:00Z [add]: New warm cozy landing page UI