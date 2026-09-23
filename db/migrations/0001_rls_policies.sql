-- 0001_rls_policies.sql
--
-- Row-Level Security policies for every user-owned table.
-- Per ADR-008 (Supabase Postgres + RLS). Defense-in-depth: application code
-- filters by user_id; RLS is the safety net if a query lands without the
-- filter.
--
-- Pattern per user-owned table:
--   CREATE POLICY user_isolation ON <table>
--     USING (user_id = current_setting('app.user_id', true)::uuid)
--     WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);
--   ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
--
-- current_setting('app.user_id', true) returns NULL when the GUC is unset;
-- comparing a UUID column to NULL never matches, so a query from a session
-- that forgot to call SET LOCAL app.user_id returns zero rows. That's the
-- "fallback to Supabase when a query fails to use userid" behavior — the DB
-- catches what app code missed.
--
-- System tables (no user_id column) are exempt. Today there are no such
-- tables in this schema; the rule for new tables is: if it has user_id, it
-- gets a policy; if it doesn't, it's a system table.
--
-- The users table itself has no user_id column but is owned per-row by id.
-- The pattern for users is the same: a user can only see their own row.
-- The session GUC compares against users.id.

-- ============================================
-- USERS
-- ============================================

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON "users"
  USING (id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.user_id', true), '')::uuid);

-- ============================================
-- ROLES, VALUES, GOALS, TASKS, TIME_BLOCKS,
-- HABITS, HABIT_LOGS, JOURNAL_ENTRIES, FILE_UPLOADS
-- ============================================

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "roles"
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE "values" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "values"
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "goals"
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "tasks"
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE "time_blocks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "time_blocks"
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE "habits" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "habits"
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE "habit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "habit_logs"
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "journal_entries"
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE "file_uploads" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "file_uploads"
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

-- DOWN MIGRATION:
-- DROP POLICY IF EXISTS user_isolation ON "file_uploads";
-- DROP POLICY IF EXISTS user_isolation ON "journal_entries";
-- DROP POLICY IF EXISTS user_isolation ON "habit_logs";
-- DROP POLICY IF EXISTS user_isolation ON "habits";
-- DROP POLICY IF EXISTS user_isolation ON "time_blocks";
-- DROP POLICY IF EXISTS user_isolation ON "tasks";
-- DROP POLICY IF EXISTS user_isolation ON "goals";
-- DROP POLICY IF EXISTS user_isolation ON "values";
-- DROP POLICY IF EXISTS user_isolation ON "roles";
-- DROP POLICY IF EXISTS user_isolation ON "users";
-- ALTER TABLE "file_uploads" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "journal_entries" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "habit_logs" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "habits" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "time_blocks" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "tasks" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "goals" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "values" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
