#!/usr/bin/env bash
# Deploy SYLORA public test stand on a VPS with Docker + DNS.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAND_DIR="$ROOT/infrastructure/public-stand"
ENV_FILE="${1:-$STAND_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run ./generate-secrets.sh then set STAND_DOMAIN + ACME_EMAIL." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
: "${STAND_DOMAIN:?STAND_DOMAIN required}"
: "${JWT_SECRET:?JWT_SECRET required}"
: "${DATA_ENCRYPTION_KEY:?DATA_ENCRYPTION_KEY required}"
: "${IP_HASH_KEY:?IP_HASH_KEY required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
: "${REDIS_PASSWORD:?REDIS_PASSWORD required}"

if [[ "$STAND_DOMAIN" == *"example.com"* ]]; then
  echo "STAND_DOMAIN still looks like a placeholder ($STAND_DOMAIN)" >&2
  exit 1
fi

SOFT="$ROOT/artifacts/sylora-gift-100-originals/soft-ping"
if [[ ! -d "$SOFT" ]]; then
  echo "Missing soft-ping artifacts at $SOFT" >&2
  exit 1
fi

echo "==> Building and starting public stand for https://${STAND_DOMAIN}"
docker compose -f "$STAND_DIR/docker-compose.yml" --env-file "$ENV_FILE" up -d --build

echo "==> Waiting for readiness"
for i in $(seq 1 90); do
  if curl -fsS "https://${STAND_DOMAIN}/health/ready" >/dev/null 2>&1; then
    echo "READY https://${STAND_DOMAIN}"
    curl -fsS "https://${STAND_DOMAIN}/v1/public/stand-status" | head -c 600 || true
    echo
    echo "Run: $STAND_DIR/verify-external.sh https://${STAND_DOMAIN}"
    echo "Then open the URL on a phone over mobile data before announcing readiness."
    exit 0
  fi
  sleep 5
done
echo "Timed out waiting for https://${STAND_DOMAIN}/health/ready" >&2
docker compose -f "$STAND_DIR/docker-compose.yml" --env-file "$ENV_FILE" ps >&2 || true
exit 1
