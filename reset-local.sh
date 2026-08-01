#!/usr/bin/env bash
# SYLORA — reset local data (destructive)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "WARNING: This destroys local SYLORA databases / Compose volumes."
read -r -p "Type RESET to continue: " confirm
if [[ "$confirm" != "RESET" ]]; then
  echo "Aborted."
  exit 1
fi

./stop-local.sh || true

if command -v docker >/dev/null 2>&1 && [[ -f infrastructure/.env ]]; then
  docker compose --env-file infrastructure/.env -f docker-compose.yml down -v
  echo "Compose volumes removed."
fi

if command -v sudo >/dev/null 2>&1 && pg_isready -h 127.0.0.1 >/dev/null 2>&1; then
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS sylora;"
  sudo -u postgres psql -c "CREATE DATABASE sylora OWNER sylora;"
  echo "Host Postgres database recreated."
fi

redis-cli FLUSHALL >/dev/null 2>&1 || true
rm -rf .sylora-local
echo "Reset complete. Run ./setup-local.sh && ./start-local.sh"
