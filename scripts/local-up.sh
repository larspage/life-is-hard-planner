#!/bin/bash
# scripts/local-up.sh — start the local-dev Postgres for LifeOS.
# Mirrors MrBrooks Admin Portal's scripts/local-up.sh pattern.
# Port 5433 to avoid collision with system Postgres on Fedora (5432).

set -euo pipefail

POSTGRES_PORT="${POSTGRES_PORT:-5433}"
POSTGRES_USER="${POSTGRES_USER:-lifeos}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-lifeos}"
POSTGRES_DB="${POSTGRES_DB:-lifeos}"
CONTAINER_NAME="lifeos-db"

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Starting existing ${CONTAINER_NAME}..."
  docker start "${CONTAINER_NAME}" >/dev/null
else
  echo "Creating ${CONTAINER_NAME} on port ${POSTGRES_PORT}..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -e "POSTGRES_USER=${POSTGRES_USER}" \
    -e "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
    -e "POSTGRES_DB=${POSTGRES_DB}" \
    -p "${POSTGRES_PORT}:5432" \
    postgres:16 >/dev/null
fi

# Wait for Postgres to accept connections.
echo "Waiting for Postgres to be ready..."
for _ in $(seq 1 30); do
  if docker exec "${CONTAINER_NAME}" pg_isready -U "${POSTGRES_USER}" >/dev/null 2>&1; then
    echo "Postgres ready on localhost:${POSTGRES_PORT}"
    break
  fi
  sleep 1
done

cat <<EOF

To connect:
  export DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}

Or run migrations directly:
  DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB} npm run db:migrate

EOF
