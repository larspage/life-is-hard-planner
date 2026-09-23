-- 0002_force_row_level_security.sql
--
-- Apply `ALTER TABLE ... FORCE ROW LEVEL SECURITY` to every user-owned
-- table. Without `FORCE`, the table owner bypasses RLS — see
-- https://www.postgresql.org/docs/current/ddl-rowsecurity.html :
--
--   "Superusers and roles with the BYPASSRLS attribute always bypass
--    the row security system when accessing a table. Table owners
--    normally bypass row security as well, though a table owner can
--    choose to be subject to row security with ALTER TABLE ... FORCE
--    ROW LEVEL SECURITY."
--
-- In LifeOS, the application role (`lifeos`) is the table owner. The
-- policies added in 0001_rls_policies.sql target `public`, but the
-- owner-bypass meant the policies were silently inert for the only
-- role that actually queries the tables. This migration forces RLS on
-- so the policies are enforced for the application role.
--
-- The role is also downgraded from SUPERUSER (see scripts/local-up.sh
-- + scripts/init-nosuperuser.sql). Both pieces are required for
-- defense-in-depth per ADR-008:
--
--   - NOSUPERUSER + NOBYPASSRLS so Postgres itself doesn't bypass.
--   - FORCE ROW LEVEL SECURITY so the owner-bypass doesn't apply.
--
-- Idempotent: `ALTER TABLE ... FORCE ROW LEVEL SECURITY` is a no-op
-- if RLS is already forced on the table.

ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE values FORCE ROW LEVEL SECURITY;
ALTER TABLE goals FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE time_blocks FORCE ROW LEVEL SECURITY;

-- ============================================
-- Auth-bootstrap policy on `users`
-- ============================================
--
-- Problem: the credentials provider in lib/auth.ts has to look up a
-- user by email BEFORE knowing the user_id. With FORCE ROW LEVEL
-- SECURITY on, the existing `user_isolation` policy blocks that
-- lookup (it requires `app.user_id` to be set, which is exactly what
-- we're trying to discover).
--
-- Solution: a second policy that allows a single-row SELECT when
-- `app.auth_email_lookup` is set to the target email. The policy is
-- narrow:
--
--   - It only grants SELECT. INSERT/UPDATE/DELETE are still gated by
--     `user_isolation`.
--   - It only matches the row whose email matches the GUC exactly.
--     A request with `app.auth_email_lookup = 'a@b.com'` cannot read
--     the row for `c@d.com`.
--   - The GUC is set by lib/auth.ts only inside a transaction, for
--     the duration of the credentials authorize() call. Nothing else
--     sets it.
--
-- We use a separate GUC name (not `app.user_id`) so a stray SET on
-- the auth GUC can't accidentally lift the per-row isolation that
-- `user_isolation` enforces for every other path.
--
-- This is the standard "self-lookup" pattern for RLS-gated auth. See
-- https://www.postgresql.org/docs/current/ddl-rowsecurity.html and
-- the Supabase auth-uid pattern for the same shape.

CREATE POLICY auth_email_lookup ON "users"
  FOR SELECT
  USING (email = current_setting('app.auth_email_lookup', true));

-- DOWN MIGRATION:
-- DROP POLICY IF EXISTS auth_email_lookup ON "users";
-- (and the FORCE ALTERs above can be reverted with NO FORCE).