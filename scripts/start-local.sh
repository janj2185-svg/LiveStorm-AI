#!/usr/bin/env bash
# Start LiveStorm / SYLORA locally for friend testing.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env.local ]; then
  echo "Missing .env.local — copy from docs or create one."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

export DATABASE_URL="${DATABASE_URL:-postgresql://livestorm:livestorm_dev@127.0.0.1:5432/livestorm}"
export PORT="${PORT:-8080}"
export NODE_ENV="${NODE_ENV:-development}"
export LOCAL_DEV_AUTH="${LOCAL_DEV_AUTH:-1}"
export TIKTOK_MODE="${TIKTOK_MODE:-demo}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

# Frontend env
export VITE_LOCAL_DEV_AUTH="${VITE_LOCAL_DEV_AUTH:-1}"
export VITE_CLERK_PUBLISHABLE_KEY="${VITE_CLERK_PUBLISHABLE_KEY:-pk_test_local_dev_bypass}"
export BASE_PATH="${BASE_PATH:-/}"
FRONTEND_PORT="${FRONTEND_PORT:-23121}"

mkdir -p /tmp/livestorm-private /tmp/livestorm-public

# Ensure Postgres is up
if command -v pg_isready >/dev/null 2>&1; then
  if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    sudo service postgresql start || true
    sleep 1
  fi
fi

echo "==> Building shared libs"
pnpm run typecheck:libs || true

echo "==> Starting API on :$PORT"
pnpm --filter @workspace/api-server run build
(
  cd "$ROOT"
  PORT="$PORT" NODE_ENV=development \
    DATABASE_URL="$DATABASE_URL" \
    LOCAL_DEV_AUTH="$LOCAL_DEV_AUTH" \
    TIKTOK_MODE="$TIKTOK_MODE" \
    AI_INTEGRATIONS_OPENAI_API_KEY="${AI_INTEGRATIONS_OPENAI_API_KEY:-}" \
    AI_INTEGRATIONS_OPENAI_BASE_URL="${AI_INTEGRATIONS_OPENAI_BASE_URL:-https://api.openai.com/v1}" \
    OPENAI_API_KEY="${OPENAI_API_KEY:-}" \
    CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY:-}" \
    CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-}" \
    pnpm --filter @workspace/api-server run start
) &
API_PID=$!

cleanup() {
  kill "$API_PID" "$FE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for health
for i in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null; then
    echo "==> API healthy"
    break
  fi
  sleep 0.5
done

echo "==> Starting frontend on :$FRONTEND_PORT (local auth bypass)"
PORT="$FRONTEND_PORT" BASE_PATH="$BASE_PATH" \
  VITE_LOCAL_DEV_AUTH=1 \
  VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" \
  pnpm --filter @workspace/livestorm-ai run dev &
FE_PID=$!

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Local SYLORA / LiveStorm is starting"
echo "  Web UI:   http://localhost:$FRONTEND_PORT/dashboard"
echo "  API:      http://localhost:$PORT/api/health"
echo "  Auth:     LOCAL_DEV_AUTH (auto login as owner)"
echo "  TikTok:   TIKTOK_MODE=$TIKTOK_MODE"
echo "════════════════════════════════════════════════════════"
echo ""
wait
