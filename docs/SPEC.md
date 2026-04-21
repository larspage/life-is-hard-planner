# LifeOS — Specification Document

> Derived from LifeIsHardPlanner.md
> Status: Planning — No code started

---

## 1. Project Overview

**Project Name:** LifeOS
**Type:** Web Application (Planning & Execution System)
**Core Summary:** A principle-based planning system combining Franklin Covey methodology with bullet journaling and modern task management.
**Target Users:** Individuals seeking intentional, values-aligned productivity.

---

## 2. Feature Phases

### MVP (Minimum Viable Product)

The MVP delivers a functional core system with these features:

#### Identity Layer
- [ ] Roles (name, description, priority weight, color)
- [ ] Values (text entries with optional tags)
- [ ] Goals (long-term 1+ year, mid-term quarter/month, linked to roles)
- [ ] Subscription management (tier tracking, trial expiry)
- [ ] File uploads with 10MB limit for free/trial tier

#### Task System
- [ ] Tasks: title, description, duration, quadrant (I-II-III-IV), role_id, parent_task_id, status, energy_level
- [ ] Subtasks: nested structure with optional inheritance
- [ ] Task splitting: 90min → 3×30min blocks

#### Time Allocation
- [ ] TimeBlocks: task_id, start_time, end_time
- [ ] Configurable slot granularity: 60/30/15 min

#### Calendar Views
- [ ] Daily View: timeline with slots, scheduled tasks, daily log panel
- [ ] Weekly View: 7-day grid, role filter, quadrant filter, big rock marking
- [ ] Monthly View: high-level commitments
- [ ] List View: chronological, filterable (role, quadrant, status)

#### Weekly Planning UI
- [ ] Left Panel: roles list, active goals, Q2 suggestions
- [ ] Center Panel: 7-day grid with time axis
- [ ] Right Panel: task pool with filters
- [ ] Big Rock workflow: highlight Q2 → mark → place → review balance

#### Daily Planning UI
- [ ] Timeline View: vertical day timeline, current time indicator
- [ ] Task List Panel: today's tasks, quick-add
- [ ] Daily Log: bullet journal entry types (• ○ – ✓ →)
- [ ] Morning review, day execution, end-of-day summary

#### Feedback System
- [ ] Completion indicator (tasks completed count)
- [ ] Visual progress bar for day
- [ ] Positive reinforcement messaging

#### Data Models (MVP)
- Users
- Roles
- Goals
- Tasks
- TimeBlocks

#### Technical Stack (MVP)
- Frontend: Next.js (React), Zustand
- Backend: Node.js (Express or NestJS), REST API
- Database: PostgreSQL with JSONB
- Deployment: Single DigitalOcean droplet, Docker

---

### Phase 2: Enhanced Weekly Planning (Post-MVP)

**Phase 2a: Drag-and-Drop Scheduling**
- [ ] Weekly grid becomes drag-and-drop target
- [ ] Task pool becomes draggable
- [ ] Drag task → drop on time slot → create TimeBlock
- [ ] Visual feedback during drag (ghost, valid drop targets)

**Phase 2b: Role Balance + Warnings**
- [ ] Role distribution chart (pie/bar)
- [ ] Overbooking warnings (red highlight when > available hours)
- [ ] Whitespace indicator ("X hours remaining this week")
- [ ] Real-time balance updates on schedule changes

**Phase 2c: Planning Consistency**
- [ ] Daily planning streak tracking
- [ ] Weekly summary generation (tasks completed, big rocks done)
- [ ] Streak UI component
- [ ] Planning frequency metrics

### Phase 3: Habit Tracking (Post-MVP)

Features that build on MVP infrastructure:

- [ ] Habit records (name, frequency, target)
- [ ] HabitLogs (date, completed boolean)
- [ ] Habit checklist UI in Daily View
- [ ] Habit tracker templates
- [ ] Customizable daily log entry types

---

### Phase 4: Future Vision

Long-term aspirational features:

- [ ] AI-assisted planning suggestions
- [ ] Predictive scheduling based on energy patterns
- [ ] External calendar integrations (Google Calendar, Cal.com)
- [ ] Custom dashboard marketplace
- [ ] Mobile companion app (iOS/Android)
- [ ] Multi-user / team features
- [ ] Analytics dashboard

---

### Phase 3: Future Vision

Long-term aspirational features:

- [ ] AI-assisted planning suggestions
- [ ] Predictive scheduling based on energy patterns
- [ ] External calendar integrations (Google Calendar, Cal.com)
- [ ] Custom dashboard marketplace
- [ ] Mobile companion app (iOS/Android)
- [ ] Multi-user / team features
- [ ] Analytics dashboard

---

## 3. Data Models (Detailed)

### Users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique |
| password_hash | VARCHAR(255) | Bcrypt |
| subscription_tier | ENUM | 'free', 'trial', 'premium', default 'trial' |
| trial_expires_at | TIMESTAMP | 60 days from registration |
| subscription_expires_at | TIMESTAMP | Nullable, premium expiry |
| uploaded_bytes | BIGINT | Cumulative bytes, default 0 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### FileUploads
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → Users.id |
| file_url | VARCHAR(500) | Stored file path/URL |
| file_name | VARCHAR(255) | Original filename |
| file_size | BIGINT | Bytes |
| mime_type | VARCHAR(100) | e.g., 'image/png' |
| journal_entry_id | UUID | FK → JournalEntries.id, nullable |
| created_at | TIMESTAMP | |

### SubscriptionTiers
| Tier | Price | File Limit | Features |
|------|-------|------------|-----------|----------|
| Free | $0 | 10 MB total | Core features, limited storage |
| Trial | $0 | 10 MB | Same as free, 60-day expiry |
| Premium | $9.99/mo | Unlimited | All features + storage |

### Roles
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → Users.id |
| name | VARCHAR(100) | |
| description | TEXT | Optional |
| priority_weight | INTEGER | 1-5, default 3 |
| color | VARCHAR(7) | Hex #RRGGBB |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Values (Guiding Principles)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → Users.id |
| text | TEXT | |
| tags | TEXT[] | Optional |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Goals
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → Users.id |
| role_id | UUID | FK → Roles.id, nullable |
| title | VARCHAR(255) | |
| description | TEXT | |
| horizon | ENUM | 'long_term', 'mid_term' |
| target_date | DATE | Nullable |
| status | ENUM | 'active', 'completed', 'archived' |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Tasks
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → Users.id |
| role_id | UUID | FK → Roles.id, nullable |
| goal_id | UUID | FK → Goals.id, nullable |
| parent_task_id | UUID | FK → Tasks.id, nullable (self-ref) |
| title | VARCHAR(255) | |
| description | TEXT | |
| duration | INTEGER | Minutes |
| quadrant | ENUM | 'I', 'II', 'III', 'IV' |
| status | ENUM | 'todo', 'scheduled', 'in_progress', 'complete' |
| priority_type | ENUM | 'big_rock', 'normal' |
| energy_level | INTEGER | 1-5, nullable |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### TimeBlocks
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| task_id | UUID | FK → Tasks.id |
| user_id | UUID | FK → Users.id |
| start_time | TIMESTAMP | |
| end_time | TIMESTAMP | |
| date | DATE | Denormalized for queries |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Habits
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → Users.id |
| name | VARCHAR(255) | |
| frequency | ENUM | 'daily', 'weekly', 'custom' |
| target_count | INTEGER | Default 1 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### HabitLogs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| habit_id | UUID | FK → Habits.id |
| user_id | UUID | FK → Users.id |
| date | DATE | |
| completed | BOOLEAN | |
| created_at | TIMESTAMP | |

### JournalEntries (JSONB)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → Users.id |
| date | DATE | |
| entries | JSONB | Bullet journal array |
| metadata | JSONB | Optional |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

## 4. API Endpoints (MVP)

### Auth
- `POST /api/auth/register` — Create account (auto-starts 60-day trial)
- `POST /api/auth/login` — Get JWT
- `GET /api/auth/me` — Current user

### Subscription
- `GET /api/subscription/status` — Current tier, limits, trial expiry
- `POST /api/subscription/checkout` — Create Stripe checkout session
- `POST /api/subscription/cancel` — Cancel subscription
- `POST /api/webhooks/subscription` — Handle Stripe webhooks

### Uploads
- `POST /api/uploads` — Upload file (checks 10MB limit if free/trial)
- `GET /api/uploads` — List user's uploads
- `DELETE /api/uploads/:id` — Delete upload (frees bytes)

### Roles
- `GET /api/roles` — List user's roles
- `POST /api/roles` — Create role
- `PUT /api/roles/:id` — Update role
- `DELETE /api/roles/:id` — Delete role

### Values
- `GET /api/values` — List user's values
- `POST /api/values` — Create value
- `DELETE /api/values/:id` — Delete value

### Goals
- `GET /api/goals` — List user's goals
- `POST /api/goals` — Create goal
- `PUT /api/goals/:id` — Update goal
- `DELETE /api/goals/:id` — Delete goal

### Tasks
- `GET /api/tasks` — List tasks (filters: role, quadrant, status, date range)
- `POST /api/tasks` — Create task
- `PUT /api/tasks/:id` — Update task
- `DELETE /api/tasks/:id` — Delete task
- `POST /api/tasks/:id/split` — Split task into time blocks
- `POST /api/tasks/:id/migrate` — Move incomplete to future

### TimeBlocks
- `GET /api/time-blocks` — List (filters: date range)
- `POST /api/time-blocks` — Create (schedule task)
- `PUT /api/time-blocks/:id` — Reschedule
- `DELETE /api/time-blocks/:id` — Unschedule

### Daily View
- `GET /api/daily/:date` — Get day data (tasks + blocks + journal)
- `POST /api/daily/:date/journal` — Add journal entry

### Weekly View
- `GET /api/weekly/:startDate` — Get week data
- `GET /api/weekly/:startDate/summary` — Get role/quadrant balance

---

## 5. Frontend Component Architecture

### Pages
- `/` — Dashboard (daily view default)
- `/weekly` — Weekly planner
- `/monthly` — Monthly overview
- `/tasks` — Task list
- `/identity` — Roles, values, goals
- `/habits` — Habit tracker
- `/settings` — User settings

### Core Components

#### Identity
- `<RoleCard />` — Display role with color
- `<RoleForm />` — Create/edit role
- `<ValueList />` — Values display
- `<GoalCard />` — Goal display with horizon

#### Task System
- `<TaskCard />` — Task summary (title, duration, quadrant badge)
- `<TaskDetail />` — Full task view
- `<TaskForm />` — Create/edit task
- `<TaskPool />` — Unscheduled task list with filters

---

## Logging & Monitoring (Infrastructure)

### Grafana + Loki (Self-Hosted)

**Purpose:** Centralized logging with search, performance tracking, alerting.

**Components:**
- **Loki** — Log aggregator (receives via HTTP or Promtail)
- **Grafana** — Dashboards + visualization

**Features:**
- Search logs across all apps
- Track request duration (elapsed time on each call)
- Threshold alerts (e.g., alert if any request > X seconds)
- Auto-archive (configurable retention)
- Dynamic log levels (debug, info, warn, error) — no restart
- Dashboard showing all apps

**Configuration:**
| Setting | Value |
|---------|-------|
| Loki port | 3100 |
| Grafana port | 3000 |
| Retention | 30 days (configurable) |
| Log levels | debug, info, warn, error |

**Alerting:**
- Email/Slack when request exceeds threshold
- Grafana UI > Alerting > New rule

**Integration:**
```javascript
// Winston/Pino transport for Loki
// Node app logs → HTTP → Loki → Grafana
```

**Future apps:** Add Loki logging to each new application.

#### Calendar Views
- `<DailyTimeline />` — Day timeline grid
- `<WeeklyGrid />` — 7-day scheduling grid
- `<MonthlyCalendar />` — Month grid
- `<TimeSlot />` — Individual slot component

#### Weekly Planner
- `<PlanningContextPanel />` — Roles + goals + Q2
- `<WeeklyGridPanel />` — Main grid
- `<TaskPoolPanel />` — Draggable task list

#### Daily Planner
- `<DayTimeline />` — Vertical timeline
- `<TaskListPanel />` — Today's tasks
- `<DailyLog />` — Bullet journal input

#### Feedback
- `<ProgressBar />` — Day progress
- `<CompletionMessage />` — Positive reinforcement
- `<StreakIndicator />` — Planning streak

---

## 6. State Management (Zustand)

### Stores
- `useAuthStore` — user, token, login, logout
- `useRolesStore` — roles CRUD
- `useTasksStore` — tasks CRUD, filters
- `useTimeBlocksStore` — blocks CRUD, date navigation
- `useUIStore` — current view, sidebar state, modals

---

## 7. Technical Decisions

### Stack (Confirmed)
- **Frontend:** Next.js 14+ (App Router), TypeScript, Zustand
- **Backend:** Node.js, Express or NestJS, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT with httpOnly cookies (or mock for dev)
- **Deployment:** Docker, single DigitalOcean droplet

### Mock Auth (Development)

**Purpose:** Bypass external auth service during development for faster iteration.

**Configuration:**
- `MOCK_AUTH=true` (`.env`) → Use mock authentication
- `MOCK_AUTH=false` → Use real auth service

**Mock Users (seeded):**
| Email | Password | Notes |
|-------|----------|-------|
| demo@lifeos.app | demo123 | Demo account |
| larry@lifeos.app | larry123 | Larry's dev account |

**Mock Auth Behavior:**
- `/api/auth/login` → Accepts mock credentials, returns fake JWT + user
- `/api/auth/me` → Returns mock user from cookie/localStorage
- Frontend `useAuthStore` → Has `mockMode` flag
- **Replaceable:** All auth calls go through `/lib/auth/`, swap mock for real client

**When Ready:**
- Flip `MOCK_AUTH=false`
- Implement real auth service client in `/lib/auth/real-client.ts`
- Remove mock users from seed script

### Not Decided (Deferred)
- Styling: Tailwind CSS vs CSS Modules vs Styled Components
- Drag-and-drop library: react-beautiful-dnd vs @dnd-kit
- Date library: date-fns vs dayjs vsLuxon
- Form library: React Hook Form vs Formik
- File storage: local disk vs S3-compatible (MinIO, AWS S3)

### Subscription & Upload Logic (MVP)

**Trial Flow:**
1. User registers → `subscription_tier = 'trial'`, `trial_expires_at = NOW() + 60 days`
2. User logs in → check `trial_expires_at`; if expired, downgrade to `free`
3. Free tier limited to 10MB total uploads

**Upload Check (per file):**
```
if user.subscription_tier IN ('free', 'trial') AND user.uploaded_bytes + file.size > 10MB:
    reject upload (412 Payload Too Large)
```

**File Storage:**
- Store files in `/uploads/:userId/:fileId` (local) or S3
- Track `file_size` in FileUploads table
- On delete: subtract bytes from user's `uploaded_bytes`

### Deferred (Phase 2+)
- Redis for sessions/scaling
- Calendar integrations
- Mobile app

---

## 8. Quality Requirements

### Code Quality
- All exported functions, classes, and modules **must** have JSDoc comments
- All API endpoints documented in OpenAPI/Swagger
- No TODO comments in production code (use GitHub issues instead)

### Testing Requirements
- **85% code coverage** required on unit tests
- Minimum coverage enforced in CI pipeline
- Test files mirror source file structure (`*.test.ts` next to `*.ts`)

### GitHub Workflow
- **Every major milestone pushes to GitHub** (under `larspage`)
- Branch protection: `main` requires PR + tests passing
- Commit messages follow conventional commits (`feat:`, `fix:`, `docs:`)
- Release tags for each shipped phase (`v0.1.0-mvp`, `v0.2.0-phase2a`, etc.)

### Parallel Development
- Independent components developed in parallel where possible
- Use subagents for: schema, API routes, frontend components, tests
- Each parallel task has clear interface contracts

---

## 9. Development Order

### MVP Sequence

1. **Setup** — Project scaffolding, Docker, database
2. **Auth** — Register, login, JWT
3. **Identity** — CRUD for roles, values, goals
4. **Task System** — CRUD + filtering
5. **Time Blocks** — Scheduling/unscheduling
6. **Weekly View** — Grid + task pool + filters
7. **Daily View** — Timeline + daily log
8. **Feedback** — Progress indicators

---

## 9. Out of Scope (MVP)

These features are explicitly NOT in MVP:

- Drag-and-drop (Phase 2)
- Habit tracking (Phase 2)
- External calendar sync (Phase 3)
- AI features (Phase 3)
- Mobile app (Phase 3)
- Analytics (Phase 3)
- Multi-user/teams (Phase 3)

---

## 10. Success Criteria

MVP is complete when:

1. User can create account and log in
2. User can define roles, values, goals
3. User can create and schedule tasks
4. User can plan their week visually
5. User can execute daily tasks with timeline
6. User can log daily reflections
7. User sees progress feedback on completion

---

*Document Status: Planning Complete — Ready for Development*
*Next Step: Confirm MVP scope, initialize project structure*