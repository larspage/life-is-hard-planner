-- scripts/init-nosuperuser.sql
--
-- Idempotently creates the application role + database that the
-- postgres:16 Docker image does not create on its own. Run as the
-- container's built-in `postgres` OS user (the actual superuser) by
-- scripts/local-up.sh after the container is up.
--
-- Why the role is NOT a superuser:
--   The postgres Docker image normally creates POSTGRES_USER as a
--   superuser. Superusers bypass every row-level security policy in
--   the database, which makes the FORCE RLS policies in
--   db/migrations/0002_force_row_level_security.sql irrelevant. We
--   need `lifeos` to be a plain role with limited privileges so the
--   RLS defense-in-depth promised by ADR-008 actually applies.
--
-- `NOSUPERUSER NOBYPASSRLS` are the two attributes that matter for
-- RLS. `CREATEDB CREATEROLE` are kept so that drizzle-kit migrations
-- (which need CREATE TABLE on owned databases and GRANT on roles)
-- still work without a separate admin connection for routine schema
-- evolution. Table ownership itself is established by the initial
-- schema migration that runs after this script.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lifeos') THEN
    CREATE ROLE lifeos WITH LOGIN PASSWORD 'lifeos'
      NOSUPERUSER NOBYPASSRLS CREATEDB CREATEROLE;
  ELSE
    -- Idempotent: existing role may still be a superuser from a
    -- pre-ADR-019 container. Corrected here.
    ALTER ROLE lifeos NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

-- Database must exist before the connection string works. Idempotent.
SELECT 'CREATE DATABASE lifeos OWNER lifeos'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'lifeos')
\gexec

GRANT ALL PRIVILEGES ON DATABASE lifeos TO lifeos;

-- Postgres 15+ revokes CREATE on the public schema from PUBLIC by
-- default. As the database owner, lifeos still owns the database, but
-- it does not inherit CREATE on public - so drizzle-kit can't create
-- the migrations bookkeeping or the user-owned tables on first init.
-- GRANT CREATE here is what 0000_initial_schema.sql relied on
-- implicitly when the role was a superuser.
GRANT CREATE ON SCHEMA public TO lifeos;