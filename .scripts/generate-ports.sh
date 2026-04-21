#!/bin/bash
# Port generator for projects
# Usage: source generate-ports.sh [project_name]

PROJECT_NAME=${1:-$(basename $(pwd))}

# Generate deterministic ports based on project name hash
HASH=$(echo "$PROJECT_NAME" | md5sum | cut -c1-4)
HASH_DEC=$((16#$HASH))

# Calculate ports (avoid 3000-3999 range collision with Next.js defaults)
# Use 4000-4999 for API, 5000-5999 for web alternatives
API_PORT=$((4000 + (HASH_DEC % 1000)))
WEB_PORT=$((5000 + (HASH_DEC % 1000)))
DB_PORT=$((5432 + (HASH_DEC % 100)))
LOKI_PORT=$((3100 + (HASH_DEC % 100)))
GRAFANA_PORT=$((3000 + (HASH_DEC % 100)))

echo "export API_PORT=$API_PORT"
echo "export WEB_PORT=$WEB_PORT"
echo "export DB_PORT=$DB_PORT"
echo "export LOKI_PORT=$LOKI_PORT"
echo "export GRAFANA_PORT=$GRAFANA_PORT"
