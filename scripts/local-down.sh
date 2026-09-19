#!/bin/bash
# scripts/local-down.sh — stop the LifeOS local-dev Postgres without
# deleting its volume (data persists across `local:down`).

set -euo pipefail

CONTAINER_NAME="lifeos-db"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Stopping ${CONTAINER_NAME}..."
  docker stop "${CONTAINER_NAME}" >/dev/null
else
  echo "${CONTAINER_NAME} is not running."
fi
