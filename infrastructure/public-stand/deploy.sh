#!/usr/bin/env bash
# Deploy SYLORA public test stand on a VPS with Docker + DNS.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAND_DIR="$ROOT/infrastructure/public-stand"
ENV_FILE="${1:-$STAND_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.example and fill secrets first." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
: "${STAND_DOMAIN:?STAND_DOMAIN required}"

echo "==> Building and starting public stand for https://${STAND_DOMAIN}"
docker compose -f "$STAND_DIR/docker-compose.yml" --env-file "$ENV_FILE" up -d --build

echo "==> Waiting for readiness"
for i in $(seq 1 60); do
  if curl -fsS "https://${STAND_DOMAIN}/health/ready" >/dev/null 2>&1; then
    echo "READY https://${STAND_DOMAIN}"
    curl -fsS "https://${STAND_DOMAIN}/v1/public/stand-status" | head -c 400
    echo
    exit 0
  fi
  sleep 5
done
echo "Timed out waiting for https://${STAND_DOMAIN}/health/ready" >&2
exit 1
