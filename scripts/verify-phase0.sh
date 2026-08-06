#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> SYLORA Phase 0 verification"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -v '^#' .env | grep -v '^CORS_ORIGINS=')
  set +a
else
  export DATABASE_URL="${DATABASE_URL:-postgresql://sylora:sylora@localhost:5433/sylora}"
  export REDIS_URL="${REDIS_URL:-redis://localhost:6380/0}"
  export JWT_SECRET="${JWT_SECRET:-test-jwt-secret-minimum-32-characters-long}"
fi

echo "==> UI package tests"
cd packages/ui && npx vitest run && cd "$ROOT"

echo "==> Web i18n tests"
cd apps/web && npx vitest run && cd "$ROOT"

echo "==> API unit tests"
cd services/platform-api
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -e ".[dev]"
pytest -q
cd "$ROOT"

echo "==> API health (if running)"
if curl -sf http://localhost:8080/v1/health >/dev/null 2>&1; then
  echo "API health: OK"
else
  echo "API health: skipped (start uvicorn on :8080 to verify)"
fi

echo "==> Phase 0 checks passed"
