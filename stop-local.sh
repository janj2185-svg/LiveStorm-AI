#!/usr/bin/env bash
# SYLORA — stop local stack
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

stop_pidfile() {
  local f="$1" name="$2"
  if [[ -f "$f" ]]; then
    local pid
    pid="$(cat "$f")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
      echo "Stopped $name (pid $pid)"
    fi
    rm -f "$f"
  fi
}

if command -v docker >/dev/null 2>&1 && [[ -f infrastructure/.env ]]; then
  docker compose --env-file infrastructure/.env -f docker-compose.yml down 2>/dev/null || true
fi

stop_pidfile .sylora-local/api.pid api
stop_pidfile .sylora-local/celery.pid celery
stop_pidfile .sylora-local/vite.pid vite

# Also kill stray listeners if pidfiles missing
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite --host" 2>/dev/null || true

echo "SYLORA local stack stopped (volumes preserved)."
