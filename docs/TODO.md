# LifeOS — Project Planning

> This is a **planning** document. For active tracking, see STATE/TODO.md.

## Status: Planning

---

## Active

- [ ] Review data structure (Prisma schema)
- [ ] Confirm MVP scope with Larry
- [ ] Initialize project structure (repository + Docker)
- [ ] Set up PostgreSQL schema with Prisma

## Pending

### Phase 1: Setup
- [ ] Create repository under larspage (github)
- [ ] Configure Docker Compose (app + DB + Loki + Grafana)
- [ ] Set up TypeScript + ESLint + Jest/Vitest
- [ ] Verify empty shell builds and runs
- [ ] Integrate Winston logger with Loki transport

### Phase 2: Authentication
- [ ] Implement user registration endpoint (auto-start 60-day trial)
- [ ] Implement login with JWT + trial expiry check
- [ ] Create auth store in Zustand
- [ ] Add protected route middleware
- [ ] Add mock users to seed script (demo@lifeos.app, larry@lifeos.app)
- [ ] Create mock auth endpoints (login, me)
- [ ] Add MOCK_AUTH environment flag
- [ ] Add mockMode to useAuthStore
- [ ] Create /lib/auth/ module (swap mock for real later)

### Phase 3: Subscription + Uploads (MVP)
- [ ] Add subscription fields to Users table
- [ ] Create FileUploads table
- [ ] Implement file upload endpoint with 10MB limit check
- [ ] Integrate Stripe checkout (or placeholder)
- [ ] Add webhook handler for subscription events
- [ ] Create subscription status API endpoint
- [ ] Add tier check to auth store
- [ ] File upload endpoint (with tier check)
- [ ] Upload deletion endpoint (frees bytes)
- [ ] Upload list endpoint

### Phase 4: Identity Layer
- [ ] Roles CRUD API + UI
- [ ] Values CRUD API + UI
- [ ] Goals CRUD API + UI
- [ ] Connect to user account

### Phase 5: Task System
- [ ] Tasks CRUD API
- [ ] Task filtering (role, quadrant, status)
- [ ] Task splitting logic
- [ ] Task form UI

### Phase 6: Time Blocks
- [ ] TimeBlocks CRUD API
- [ ] Scheduling/unscheduling endpoints
- [ ] Date navigation UI

### Phase 7: Weekly View
- [ ] Weekly grid component
- [ ] Task pool panel
- [ ] Big Rock marking workflow
- [ ] Filter by role/quadrant

### Phase 8: Daily View
- [ ] Daily timeline component
- [ ] Day tasks panel
- [ ] Daily log (bullet journal)
- [ ] Current time indicator

### Phase 9: Feedback
- [ ] Progress bar component
- [ ] Completion messaging
- [ ] Daily summary

### Phase 10: Enhanced Weekly (Phase 2a)
- [ ] Weekly grid becomes drag-and-drop target
- [ ] Task pool becomes draggable
- [ ] Drag task → drop on time slot → create TimeBlock
- [ ] Visual feedback during drag (ghost, valid drop targets)

### Phase 11: Role Balance + Warnings (Phase 2b)
- [ ] Role distribution chart (pie/bar)
- [ ] Overbooking warnings (red highlight when > available hours)
- [ ] Whitespace indicator ("X hours remaining this week")
- [ ] Real-time balance updates on schedule changes

### Phase 12: Planning Consistency (Phase 2c)
- [ ] Daily planning streak tracking
- [ ] Weekly summary generation (tasks completed, big rocks done)
- [ ] Streak UI component
- [ ] Planning frequency metrics

### Phase 13: Habit Tracking (Phase 3)
- [ ] Habit records CRUD
- [ ] HabitLogs model + API
- [ ] Habit checklist UI in Daily View
- [ ] Habit tracker templates
- [ ] Customizable daily log entry types

---

## Quality Requirements

- [ ] Set up Jest/Vitest with 85% coverage gate
- [ ] Configure GitHub branch protection (main requires PR + tests)
- [ ] Set up conventional commits
- [ ] Add JSDoc to all exported functions

---

## GitHub Milestones (Push to larspage)

- [ ] v0.1.0-mvp: Core planning system shipped
- [ ] v0.2.0-phase2a: Drag-and-drop scheduling
- [ ] v0.2.0-phase2b: Role balance visualization
- [ ] v0.2.0-phase2c: Planning consistency
- [ ] v0.3.0-habit-tracking: Habits + bullet journal

---

## Done

- [x] 2025-04-20 - Analyze LifeIsHardPlanner.md
- [x] 2025-04-20 - Create SPEC.md
- [x] 2025-04-20 - Create TODO.md (this file)
- [x] 2025-04-20 - Create ROADMAP.md
- [x] 2025-04-20 - Add subscription tiers to SPEC.md
- [x] 2025-04-20 - Add file upload limits to SPEC.md
- [x] 2025-04-20 - Add mock auth for development
- [x] 2025-04-20 - Break Phase 2 into smaller phases (2a, 2b, 2c)
- [x] 2025-04-20 - Add quality requirements (85% tests, JSDoc, GitHub workflow)
- [x] 2025-04-20 - Create Prisma schema (docs/schema.prisma)
- [x] 2025-04-20 - Add timeScaleConfig to User (Boulder/Rock/Pebble/Sand)
- [x] 2025-04-20 - Create time-units.ts config