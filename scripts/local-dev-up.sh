#!/usr/bin/env bash
# Local friend-testing bootstrap without Docker.
# Starts PostgreSQL/Redis if needed, migrates, seeds demo accounts, runs the API.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="$ROOT/services/api"
ENV_FILE="${API}/.env"

log() { printf '[sylora-local] %s\n' "$*"; }
die() { printf '[sylora-local] ERROR: %s\n' "$*" >&2; exit 1; }

command -v python3.12 >/dev/null || die "python3.12 is required"
command -v redis-server >/dev/null || die "redis-server is required (apt install redis-server)"
command -v psql >/dev/null || die "psql is required (apt install postgresql postgresql-client)"
command -v pg_isready >/dev/null || die "pg_isready is required"

if [[ ! -f "$ENV_FILE" ]]; then
  log "Creating $ENV_FILE from example with generated secrets"
  cp "$API/.env.example" "$ENV_FILE"
  JWT="$(python3.12 -c 'import secrets; print(secrets.token_urlsafe(48))')"
  FERNET="$(python3.12 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')"
  IPHASH="$(python3.12 -c 'import secrets; print(secrets.token_urlsafe(48))')"
  python3.12 - "$ENV_FILE" "$JWT" "$FERNET" "$IPHASH" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
replacements = {
    "CHANGE_ME": "sylora_local_dev_password",
    "CHANGE_ME_USE_AT_LEAST_32_RANDOM_CHARACTERS": sys.argv[2],
    "CHANGE_ME_FERNET_KEY": sys.argv[3],
    "CHANGE_ME_SEPARATE_HIGH_ENTROPY_KEY": sys.argv[4],
    "https://api.sylora.example": "http://localhost:8000",
    "sylora-api": "sylora-local",
}
for old, new in replacements.items():
    text = text.replace(old, new)
path.write_text(text)
PY
fi

if ! redis-cli ping >/dev/null 2>&1; then
  log "Starting Redis on 127.0.0.1:6379"
  redis-server --daemonize yes --bind 127.0.0.1 --port 6379 --save "" --appendonly no
fi
redis-cli ping >/dev/null || die "Redis is not responding"

if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  log "Starting PostgreSQL"
  if command -v pg_ctlcluster >/dev/null; then
    sudo pg_ctlcluster 16 main start || sudo service postgresql start
  else
    sudo service postgresql start
  fi
fi
pg_isready -h 127.0.0.1 -p 5432 >/dev/null || die "PostgreSQL is not accepting connections"

if ! PGPASSWORD=sylora_local_dev_password psql -h 127.0.0.1 -U sylora -d sylora -c 'SELECT 1' >/dev/null 2>&1; then
  log "Creating local sylora role/database"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sylora') THEN
    CREATE ROLE sylora LOGIN PASSWORD 'sylora_local_dev_password';
  END IF;
END$$;
SELECT 'CREATE DATABASE sylora OWNER sylora'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sylora')\gexec
GRANT ALL PRIVILEGES ON DATABASE sylora TO sylora;
SQL
  sudo -u postgres psql -d sylora -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
fi

cd "$API"
if [[ ! -d .venv ]]; then
  log "Creating Python virtualenv"
  python3.12 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -U pip
  pip install -e '.[test]'
  pip install aiosmtpd
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
  python -c 'import aiosmtpd' 2>/dev/null || pip install aiosmtpd
fi

log "Applying Alembic migrations"
alembic upgrade head

log "Seeding demo accounts"
python -m app.cli seed-demo

if [[ "${1:-}" == "--seed-only" ]]; then
  log "Seed complete"
  exit 0
fi

# Optional local SMTP sink so registration emails queue successfully.
if ! (echo >/dev/tcp/127.0.0.1/1025) >/dev/null 2>&1; then
  log "Starting SMTP sink on 127.0.0.1:1025"
  python - <<'PY' >/tmp/sylora-smtp-sink.log 2>&1 &
from aiosmtpd.controller import Controller
import time
class H:
    async def handle_DATA(self, server, session, envelope):
        print(f"SMTP ok to={envelope.rcpt_tos}", flush=True)
        return "250 OK"
Controller(H(), hostname="127.0.0.1", port=1025).start()
print("SMTP sink listening", flush=True)
while True:
    time.sleep(3600)
PY
  sleep 1
fi

log "Starting API on http://127.0.0.1:8000"
log "OpenAPI: http://127.0.0.1:8000/docs"
exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
