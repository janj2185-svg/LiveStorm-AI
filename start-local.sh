#!/usr/bin/env bash
# SYLORA — start local stack (Docker preferred, --host fallback)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
mkdir -p .sylora-local/logs

MODE="docker"
if [[ "${1:-}" == "--host" ]] || ! command -v docker >/dev/null 2>&1; then
  if [[ "${1:-}" != "--host" ]] && ! command -v docker >/dev/null 2>&1; then
    echo "Docker not found — falling back to host mode."
  fi
  MODE="host"
fi

if [[ "$MODE" == "docker" ]]; then
  if [[ ! -f infrastructure/.env ]]; then
    echo "Missing infrastructure/.env — run ./setup-local.sh first"
    exit 1
  fi
  echo "Starting SYLORA via Docker Compose..."
  docker compose --env-file infrastructure/.env -f docker-compose.yml up --build -d
  echo "Waiting for API health..."
  for i in $(seq 1 60); do
    if curl -sf http://127.0.0.1:8000/health/ready >/dev/null 2>&1; then
      echo "API ready."
      break
    fi
    sleep 2
  done
  # Migrations (Compose does not auto-run Alembic)
  docker compose --env-file infrastructure/.env -f docker-compose.yml exec -T api \
    alembic upgrade head || echo "WARN: migrate via: docker compose exec api alembic upgrade head"
  docker compose --env-file infrastructure/.env -f docker-compose.yml exec -T api \
    python -m scripts.seed_owner_accounts 2>/dev/null \
    || docker compose --env-file infrastructure/.env -f docker-compose.yml exec -T api \
      python /app/../../scripts/seed_owner_accounts.py 2>/dev/null \
    || echo "WARN: seed accounts manually: python3 scripts/seed_owner_accounts.py"

  echo "Seeding product demo via host Python (API HTTP)..."
  python3 scripts/seed_product_demo.py \
    || echo "WARN: product demo seed failed — run: python3 scripts/seed_product_demo.py"

  # Design gallery on host (Compose does not include Vite)
  if command -v pnpm >/dev/null 2>&1; then
    [[ -d node_modules ]] || pnpm install
    nohup pnpm dev >.sylora-local/logs/vite.log 2>&1 &
    echo $! >.sylora-local/vite.pid
    echo "Design gallery: http://127.0.0.1:5173  (pid $(cat .sylora-local/vite.pid))"
  fi
  echo "API docs:     http://127.0.0.1:8000/docs"
  echo "Diagnostics:  http://127.0.0.1:5173/#/diagnostics"
  echo "Mailpit:      http://127.0.0.1:8025"
  echo "MinIO:        http://127.0.0.1:9001"
  exit 0
fi

# ---- Host mode ----
if [[ ! -f services/api/.env ]]; then
  ./setup-local.sh --host
fi
# Load env without bash word-splitting issues
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" == \#* ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  # strip surrounding double quotes if present
  if [[ "$val" == \"*\" ]]; then
    val="${val:1:${#val}-2}"
  fi
  export "${key}=${val}"
done < services/api/.env

# Bash line-parsing mangles JSON list values; restore critical arrays from file.
eval "$(
  python3 - <<'PY'
from pathlib import Path
text = Path("services/api/.env").read_text()
for key in ("ALLOWED_HOSTS", "CORS_ORIGINS"):
    for line in text.splitlines():
        if line.startswith(f"{key}="):
            val = line.split("=", 1)[1]
            print(f"export {key}={val!r}")
            break
PY
)"

redis-cli ping >/dev/null 2>&1 || {
  echo "Starting redis-server..."
  redis-server --daemonize yes --bind 127.0.0.1 --port 6379
}

echo "Running migrations..."
(
  cd services/api
  # Foundation revision materializes the current SQLAlchemy metadata via create_all.
  # Stamp head afterward so additive revisions that already exist in models are skipped.
  if .venv/bin/alembic upgrade 20260731_0001; then
    .venv/bin/alembic stamp head
  else
    .venv/bin/alembic upgrade head || echo "WARN: migrate via: docker compose exec api alembic upgrade head"
  fi
)

echo "Starting MediaMTX (local live ingest)..."
./scripts/start-mediamtx-local.sh || echo "WARN: MediaMTX failed — live ingest will stay unprovisioned"

# Reload API env after MediaMTX wrote MEDIAMTX_* credentials
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" == \#* ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  if [[ "$val" == \"*\" ]]; then
    val="${val:1:${#val}-2}"
  fi
  export "${key}=${val}"
done < services/api/.env

echo "Seeding owner test accounts..."
services/api/.venv/bin/python scripts/seed_owner_accounts.py

echo "Starting API (uvicorn)..."
(
  cd services/api
  nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 \
    >"$ROOT/.sylora-local/logs/api.log" 2>&1 &
  echo $! >"$ROOT/.sylora-local/api.pid"
)

if command -v celery >/dev/null 2>&1 || [[ -x services/api/.venv/bin/celery ]]; then
  (
    cd services/api
    nohup .venv/bin/celery -A app.celery_app.celery worker -l info \
      >"$ROOT/.sylora-local/logs/celery.log" 2>&1 &
    echo $! >"$ROOT/.sylora-local/celery.pid"
  ) || true
fi

echo "Starting design gallery (Vite)..."
[[ -d node_modules ]] || pnpm install
# Prefer a clean 5173 (avoid leftover LiveStorm Vite)
if command -v fuser >/dev/null 2>&1; then fuser -k 5173/tcp 2>/dev/null || true; fi
pkill -f "packages/livestorm-ai/.*vite" 2>/dev/null || true
nohup pnpm exec vite --host 0.0.0.0 --port 5173 >.sylora-local/logs/vite.log 2>&1 &
echo $! >.sylora-local/vite.pid

echo "Waiting for API..."
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:8000/health/live >/dev/null 2>&1; then
    echo "API live."
    break
  fi
  sleep 1
done

echo "Seeding product demo (handles / wallet / feed / DM)..."
(
  unset CORS_ORIGINS ALLOWED_HOSTS 2>/dev/null || true
  services/api/.venv/bin/python scripts/seed_product_demo.py
) || echo "WARN: product demo seed failed — run: python3 scripts/seed_product_demo.py"

if grep -q '^OPENAI_API_KEY=sk-' services/api/.env 2>/dev/null || grep -q '^OPENAI_API_KEY=sk-' .env.local 2>/dev/null; then
  echo "Configuring OpenAI provider from local env (key never printed)..."
  services/api/.venv/bin/python scripts/configure_openai_provider.py \
    || echo "WARN: OpenAI configure failed — run: python3 scripts/configure_openai_provider.py"
fi

echo ""
echo "SYLORA host stack started."
echo "  Gallery:      http://127.0.0.1:5173"
echo "  Diagnostics:  http://127.0.0.1:5173/#/diagnostics"
echo "  Gift Library: http://127.0.0.1:5173/#/gift-library-store"
echo "  API docs:     http://127.0.0.1:8000/docs"
echo "  Health:       http://127.0.0.1:8000/health/ready"
echo "  Logs:         .sylora-local/logs/"
echo "  MediaMTX:     http://127.0.0.1:9997 (control) / rtmp://127.0.0.1:1935"
echo "Credentials:    OWNER_TESTING_GUIDE.md"
echo "Verify loops:   ./verify-product-loop.sh"
echo "Verify live:    ./verify-live.sh"
echo "Verify AI:      ./verify-ai.sh"
