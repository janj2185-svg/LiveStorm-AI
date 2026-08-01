#!/usr/bin/env bash
# Start API + Vite frontend for local friend testing.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.local.example to .env and fill Clerk + OpenAI keys."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

mkdir -p "${PRIVATE_OBJECT_DIR:-/tmp/livestorm-private}" \
         "${PUBLIC_OBJECT_SEARCH_PATHS:-/tmp/livestorm-public}"

echo "→ Ensuring DB schema declarations…"
pnpm --filter @workspace/db exec tsc --build tsconfig.json

echo "→ Seeding demo users (idempotent)…"
pnpm --filter @workspace/api-server exec tsx src/scripts/seed-demo-users.ts || true

API_PORT="${PORT:-8080}"
WEB_PORT="${WEB_PORT:-5173}"

echo "→ Starting API on :$API_PORT"
PORT="$API_PORT" pnpm --filter @workspace/api-server run dev &
API_PID=$!

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for health
for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$API_PORT/api/health" >/dev/null; then
    echo "✓ API healthy"
    break
  fi
  sleep 1
done

echo "→ Starting web on :$WEB_PORT"
PORT="$WEB_PORT" BASE_PATH=/ pnpm --filter @workspace/livestorm-ai run dev &
WEB_PID=$!

echo ""
echo "API:  http://localhost:$API_PORT/api/health"
echo "Web:  http://localhost:$WEB_PORT"
echo "Docs: docs/LOCAL_STARTUP_GUIDE.md"
echo "Press Ctrl+C to stop."
wait
