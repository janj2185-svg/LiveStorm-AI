#!/usr/bin/env bash
# SYLORA owner local setup — generates secrets and prepares env files.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

MODE="docker"
if [[ "${1:-}" == "--host" ]]; then
  MODE="host"
fi

rand_b64() { openssl rand -base64 32 | tr -d '\n'; }
rand_hex() { openssl rand -hex "${1:-32}" | tr -d '\n'; }
fernet_key() {
  python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())' 2>/dev/null \
    || python3 -c 'import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'
}
kraft_id() {
  python3 -c 'import base64,uuid; print(base64.urlsafe_b64encode(uuid.uuid4().bytes).decode().rstrip("="))'
}

echo "=== SYLORA setup-local ($MODE) ==="
echo "Repository: $ROOT"
echo "Branch:     $(git branch --show-current 2>/dev/null || echo unknown)"
echo "Commit:     $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

if [[ "$MODE" == "docker" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker not found. Install Docker Desktop / Engine, or re-run:"
    echo "  ./setup-local.sh --host"
    exit 1
  fi
  mkdir -p infrastructure
  if [[ ! -f infrastructure/.env ]]; then
    cp .env.example infrastructure/.env
    echo "Created infrastructure/.env from .env.example"
  fi
  # Replace REPLACE_* placeholders if still present
  ENV_FILE=infrastructure/.env
  replace_if() {
    local key="$1" value="$2"
    if grep -q "^${key}=REPLACE_WITH" "$ENV_FILE" 2>/dev/null || grep -q "^${key}=$" "$ENV_FILE" 2>/dev/null; then
      # portable sed
      python3 - "$ENV_FILE" "$key" "$value" <<'PY'
import sys
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
lines = []
for line in open(path, encoding="utf-8"):
    if line.startswith(key + "="):
        lines.append(f"{key}={value}\n")
    else:
        lines.append(line)
open(path, "w", encoding="utf-8").writelines(lines)
PY
      echo "  set $key"
    fi
  }
  replace_if POSTGRES_PASSWORD "$(rand_b64)"
  replace_if REDIS_PASSWORD "$(rand_b64)"
  replace_if KAFKA_CLUSTER_ID "$(kraft_id)"
  replace_if ELASTIC_PASSWORD "$(rand_b64)"
  replace_if MINIO_ROOT_USER "sylora$(rand_hex 4)"
  replace_if MINIO_ROOT_PASSWORD "$(rand_b64)"
  replace_if JWT_SECRET "$(rand_hex 64)"
  replace_if DATA_ENCRYPTION_KEY "$(fernet_key)"
  replace_if IP_HASH_KEY "$(rand_hex 32)"
  replace_if GRAFANA_ADMIN_PASSWORD "$(rand_b64)"
  replace_if STREAM_PUBLISH_PASSWORD "$(rand_b64)"
  replace_if STREAM_READ_PASSWORD "$(rand_b64)"
  replace_if MEDIAMTX_API_PASSWORD "$(rand_b64)"
  replace_if TURN_SECRET "$(rand_hex 32)"
  replace_if RECORDING_S3_ACCESS_KEY_ID "rec$(rand_hex 4)"
  replace_if RECORDING_S3_SECRET_ACCESS_KEY "$(rand_b64)"
  echo "Docker env ready: infrastructure/.env"
  echo "Next: ./start-local.sh   OR   docker compose up --build"
else
  # Host mode
  if [[ ! -f .env.local ]]; then
    cp .env.local.example .env.local
    echo "Created .env.local"
  fi
  cp .env.local services/api/.env
  echo "Synced services/api/.env"

  # Ensure Postgres role/db when local postgres is available
  if command -v psql >/dev/null 2>&1 && pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1; then
      sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='sylora'" | grep -q 1 \
        || sudo -u postgres psql -c "CREATE USER sylora WITH PASSWORD 'sylora_local_dev_only' SUPERUSER;"
      sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='sylora'" | grep -q 1 \
        || sudo -u postgres psql -c "CREATE DATABASE sylora OWNER sylora;"
      echo "Postgres database sylora ready"
    fi
  else
    echo "WARN: PostgreSQL not reachable on 127.0.0.1:5432 — start it before ./start-local.sh --host"
  fi

  if command -v redis-cli >/dev/null 2>&1; then
    redis-cli ping >/dev/null 2>&1 || redis-server --daemonize yes --bind 127.0.0.1 --port 6379 || true
    redis-cli ping && echo "Redis ready" || echo "WARN: Redis not responding"
  else
    echo "WARN: redis-cli not found — install redis-server for host mode"
  fi

  if [[ ! -d services/api/.venv ]]; then
    python3 -m venv services/api/.venv
    services/api/.venv/bin/pip install -U pip
    services/api/.venv/bin/pip install -e "services/api/[test]"
  fi

  if [[ ! -d node_modules ]]; then
    pnpm install
  fi

  echo "Host env ready."
  echo "Next: ./start-local.sh --host"
fi
