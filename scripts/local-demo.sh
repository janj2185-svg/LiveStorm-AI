#!/usr/bin/env bash
# Local friend-demo launcher for environments where Docker overlay mounts fail.
# Starts native PostgreSQL/Redis if needed, MinIO, Mailpit, and the API.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f services/api/.env ]]; then
  echo "Missing services/api/.env — copy services/api/.env.example and fill secrets." >&2
  exit 1
fi

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -U pip wheel setuptools
  pip install -e 'services/api[test]'
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

# Redis
if ! redis-cli -a sylora_local_redis_dev_only ping >/dev/null 2>&1; then
  redis-server --daemonize yes --requirepass 'sylora_local_redis_dev_only' --bind 127.0.0.1 --port 6379
fi

# Postgres cluster (Ubuntu packages)
if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  sudo pg_ctlcluster 16 main start || sudo service postgresql start || true
fi

# MinIO
if ! curl -fsS http://127.0.0.1:9000/minio/health/live >/dev/null 2>&1; then
  mkdir -p /tmp/sylora-minio
  MINIO_ROOT_USER="$(rg '^S3_ACCESS_KEY_ID=' services/api/.env | cut -d= -f2-)"
  MINIO_ROOT_PASSWORD="$(rg '^S3_SECRET_ACCESS_KEY=' services/api/.env | cut -d= -f2-)"
  export MINIO_ROOT_USER MINIO_ROOT_PASSWORD
  nohup minio server /tmp/sylora-minio --address 127.0.0.1:9000 --console-address 127.0.0.1:9001 \
    >/tmp/minio.log 2>&1 &
  sleep 2
  mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
  mc mb -p local/sylora-local >/dev/null || true
fi

# Mailpit
if ! curl -fsS http://127.0.0.1:8025/api/v1/info >/dev/null 2>&1; then
  nohup mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025 >/tmp/mailpit.log 2>&1 &
  sleep 1
fi

cd services/api
alembic upgrade head
sylora-api bootstrap-demo | tee /tmp/sylora-bootstrap.json
echo
echo "Starting API on http://127.0.0.1:8000 ..."
echo "OpenAPI: http://127.0.0.1:8000/docs"
echo "Mailpit: http://127.0.0.1:8025"
echo "MinIO console: http://127.0.0.1:9001"
exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
