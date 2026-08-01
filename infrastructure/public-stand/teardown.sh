#!/usr/bin/env bash
# Tear down public stand and wipe local volumes (tester data).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAND_DIR="$ROOT/infrastructure/public-stand"
ENV_FILE="${1:-$STAND_DIR/.env}"

docker compose -f "$STAND_DIR/docker-compose.yml" --env-file "$ENV_FILE" down -v
echo "Public stand stopped and volumes removed."
