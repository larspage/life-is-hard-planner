#!/bin/bash
# scripts/local-up.sh - start the local-dev Postgres for LifeOS.
# Mirrors MrBrooks Admin Portal's scripts/local-up.sh pattern.
# Port 5433 to avoid collision with system Postgres on Fedora (5432).
#
# The container is bootstrapped with `postgres` as the superuser role,
# then we create a `lifeos` role that is NOSUPERUSER NOBYPASSRLS. The
# application connects as `lifeos`, which is the only role that actually
# queries the tables - and because it owns the tables AND is not
# superuser, the FORCE ROW LEVEL SECURITY migration is required to make
# RLS apply to it. See ADR-019 for the full rationale.

set -euo pipefail

POSTGRES_PORT="${POSTGRES_PORT:-5433}"
POSTGRES_USER="${POSTGRES_USER:-lifeos}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-lifeos}"
POSTGRES_DB="${POSTGRES_DB:-lifeos}"
CONTAINER_NAME="lifeos-db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Starting existing ${CONTAINER_NAME}..."
  docker start "${CONTAINER_NAME}" >/dev/null
else
  echo "Creating ${CONTAINER_NAME} on port ${POSTGRES_PORT}..."
  # The first `postgres` here is the bootstrap superuser that the
  # postgres:16 image creates by default. We do NOT use POSTGRES_USER
  # here on purpose: if we did, the image would create POSTGRES_USER as
  # a superuser, and Postgres superusers bypass every row-level
  # security policy - which makes the FORCE RLS policies in
  # 0002_force_row_level_security.sql irrelevant. We create the
  # application role ourselves via init-nosuperuser.sql.
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -e "POSTGRES_USER=postgres" \
    -e "POSTGRES_PASSWORD=postgres" \
    -e "POSTGRES_DB=${POSTGRES_DB}" \
    -p "${POSTGRES_PORT}:5432" \
    postgres:16 >/dev/null
fi

# Wait for Postgres to accept connections (as the bootstrap postgres
# superuser; `lifeos` does not exist yet).
echo "Waiting for Postgres to be ready..."
for _ in $(seq 1 30); do
  if docker exec "${CONTAINER_NAME}" pg_isready -U postgres >/dev/null 2>&1; then
    echo "Postgres ready on localhost:${POSTGRES_PORT}"
    break
  fi
  sleep 1
done

# Create the application role + database if they don't exist. Runs as
# the container's built-in `postgres` OS user (which is the actual
# superuser inside the container), so it can CREATE ROLE. Idempotent.
#
# We pipe the SQL in via stdin (`-i`) rather than `-f` because `docker
# exec` does not mount the host filesystem at the host path inside
# the container - the file would not be visible there.
docker exec -i -u postgres "${CONTAINER_NAME}" \
  psql -v ON_ERROR_STOP=1 -d "${POSTGRES_DB}" \
  < "${SCRIPT_DIR}/init-nosuperuser.sql" >/dev/null
echo "Applied scripts/init-nosuperuser.sql (lifeos role + db)."

# Apply migrations (against the application role via DATABASE_URL).
DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"
export DATABASE_URL
echo "Running migrations..."
npm run db:migrate --silent

cat <<EOF

To connect:
  export DATABASE_URL=${DATABASE_URL}

Or run migrations directly:
  DATABASE_URL=${DATABASE_URL} npm run db:migrate

EOF