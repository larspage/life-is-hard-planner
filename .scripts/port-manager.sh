#!/bin/bash
# Port manager for projects
# Usage: source port-manager.sh
# Creates/reads .project-ports file

PORTS_FILE=".project-ports"

if [ -f "$PORTS_FILE" ]; then
    # Ports already exist, source them
    source "$PORTS_FILE"
else
    # Generate new ports based on project name
    PROJECT_NAME=$(basename $(pwd))
    
    # Simple hash from project name
    HASH=$(echo "$PROJECT_NAME" | tr 'a-z' '0-9' | head -c4)
    HASH_DEC=${HASH:-1234}
    
    # Base ports with unique offset
    # API and Web get unique ports to avoid conflicts
    # DB, Loki, Grafana use standard shared ports
    OFFSET=$(( (RANDOM % 900) + 100 ))
    
    API_PORT=$((4000 + OFFSET))
    WEB_PORT=$((5000 + OFFSET))
    DB_PORT=5432    # Standard PostgreSQL port
    LOKI_PORT=3100  # Standard Loki port
    GRAFANA_PORT=$((3001 + OFFSET / 10))
    
    # Write to file
    cat > "$PORTS_FILE" << EOF
# Project ports - auto-generated
# Do not commit to git
export API_PORT=$API_PORT
export WEB_PORT=$WEB_PORT
export DB_PORT=$DB_PORT
export LOKI_PORT=$LOKI_PORT
export GRAFANA_PORT=$GRAFANA_PORT
EOF
    
    source "$PORTS_FILE"
fi

echo "Ports loaded: API=$API_PORT WEB=$WEB_PORT DB=$DB_PORT LOKI=$LOKI_PORT GRAFANA=$GRAFANA_PORT"