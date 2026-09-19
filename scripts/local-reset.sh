#!/bin/bash
# scripts/local-reset.sh — stop the local-dev Postgres AND delete its
# volume. The right choice when schema changes need a clean slate.

set -euo pipefail

CONTAINER_NAME="lifeos-db"

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing ${CONTAINER_NAME} and its volume..."
  docker rm -fv "${CONTAINER_NAME}" >/dev/null
else
  echo "${CONTAINER_NAME} does not exist."
fi

echo "Run 'npm run local:up' to recreate."
