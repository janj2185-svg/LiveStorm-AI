#!/usr/bin/env bash
# Trigger an on-demand backup now (uses the backup service environment).
set -euo pipefail
PROD_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${1:-$PROD_DIR/.env}"
cd "$PROD_DIR"
docker compose --env-file "$ENV_FILE" exec -T backup /usr/local/bin/backup-postgres.sh
echo "Backup requested/completed — check backup container logs."
