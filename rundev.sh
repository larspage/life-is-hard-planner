#!/bin/bash
# rundev.sh - Start project for development
# Usage: ./rundev.sh

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load port manager
source .scripts/port-manager.sh

echo "=========================================="
echo "  Starting $(basename $SCRIPT_DIR)"
echo "=========================================="

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Database
DATABASE_URL=postgresql://lifeos:lifeos123@localhost:$DB_PORT/lifeos
POSTGRES_USER=lifeos
POSTGRES_PASSWORD=lifeos123
POSTGRES_DB=lifeos

# Auth
JWT_SECRET=change-this-in-production
MOCK_AUTH=true

# Logging
LOKI_URL=http://localhost:$LOKI_PORT
LOG_LEVEL=info

# Ports
API_PORT=$API_PORT
WEB_PORT=$WEB_PORT
EOF
fi

# Start Docker services
echo "Starting Docker services..."
docker run -d --name lifeos-db \
    -e POSTGRES_USER=lifeos \
    -e POSTGRES_PASSWORD=lifeos123 \
    -e POSTGRES_DB=lifeos \
    -p $DB_PORT:5432 \
    postgres:16 2>/dev/null || echo "Database container already running"

docker run -d --name lifeos-loki \
    -p $LOKI_PORT:3100 \
    grafana/loki:latest 2>/dev/null || echo "Loki container already running"

docker run -d --name lifeos-grafana \
    -p $GRAFANA_PORT:3000 \
    -e GF_SECURITY_ADMIN_PASSWORD=admin \
    grafana/grafana:latest 2>/dev/null || echo "Grafana container already running"

# Wait for database
echo "Waiting for database..."
sleep 3

# Install dependencies if needed
if [ ! -d node_modules ]; then
    echo "Installing dependencies..."
    yarn install
fi

# Generate Prisma client
echo "Generating Prisma client..."
yarn db:generate 2>/dev/null || true

# Push schema
echo "Pushing database schema..."
DATABASE_URL="postgresql://lifeos:lifeos123@localhost:$DB_PORT/lifeos" yarn db:push 2>/dev/null || true

# Start API
echo "Starting API on port $API_PORT..."
cd apps/api
DATABASE_URL="postgresql://lifeos:lifeos123@localhost:$DB_PORT/lifeos" \
LOKI_URL="http://localhost:$LOKI_PORT" \
LOG_LEVEL=info \
MOCK_AUTH=true \
PORT=$API_PORT \
node_modules/.bin/tsx src/index.ts &
API_PID=$!
cd ../..

# Start Web (Next.js) on unique port
echo "Starting Web (Next.js) on port $WEB_PORT..."
cd apps/web
PORT=$WEB_PORT \
NEXT_PUBLIC_API_URL="http://localhost:$API_PORT" \
node_modules/.bin/next dev -p $WEB_PORT &
WEB_PID=$!
cd ../..

echo ""
echo "=========================================="
echo "  Services Starting..."
echo "=========================================="
echo ""
echo "  📡  API:      http://localhost:$API_PORT"
echo "  🌐  Web:      http://localhost:$WEB_PORT"
echo "  📊  Grafana: http://localhost:$GRAFANA_PORT (admin/admin)"
echo "  📝  Loki:    http://localhost:$LOKI_PORT"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

# Wait for services to start
sleep 5

# Test API
if curl -s http://localhost:$API_PORT/api/health > /dev/null 2>&1; then
    echo "✅ API is running!"
else
    echo "⚠️  API may still be starting..."
fi

# Test Web
if curl -s http://localhost:$WEB_PORT > /dev/null 2>&1; then
    echo "✅ Web is running!"
else
    echo "⚠️  Web may still be starting..."
fi

echo ""
echo "=========================================="
echo "  Ready for development!"
echo "=========================================="

# Keep script running (both API and Web)
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $API_PID $WEB_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

wait $API_PID $WEB_PID
