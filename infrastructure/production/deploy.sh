#!/usr/bin/env bash
# First-time (or full) deploy of SYLORA production stack on Hetzner.
set -euo pipefail
PROD_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${1:-$PROD_DIR/.env}"

[[ -f "$ENV_FILE" ]] || {
  echo "Missing $ENV_FILE — run ./generate-secrets.sh first" >&2
  exit 1
}

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${DOMAIN:?DOMAIN required}"
: "${ACME_EMAIL:?ACME_EMAIL required}"
: "${POSTGRES_PASSWORD:?}"
: "${REDIS_PASSWORD:?}"
: "${JWT_SECRET:?}"
: "${DATA_ENCRYPTION_KEY:?}"
: "${IP_HASH_KEY:?}"
: "${S3_ENDPOINT_URL:?S3/R2 endpoint required}"
: "${S3_BUCKET:?}"
: "${S3_ACCESS_KEY_ID:?}"
: "${S3_SECRET_ACCESS_KEY:?}"

if [[ "${DOMAIN}" == *"example.com"* ]]; then
  echo "DOMAIN still looks like a placeholder" >&2
  exit 1
fi

APP_ENVIRONMENT="${APP_ENVIRONMENT:-production}"
if [[ "$APP_ENVIRONMENT" == "production" ]]; then
  : "${SMTP_HOST:?SMTP_HOST required for production}"
  : "${SMTP_FROM_EMAIL:?SMTP_FROM_EMAIL required for production}"
  if [[ "${TEST_STAND_MODE:-false}" =~ ^(true|1|yes)$ ]]; then
    echo "TEST_STAND_MODE cannot be true when APP_ENVIRONMENT=production" >&2
    exit 1
  fi
fi

cd "$PROD_DIR"

# Always build Caddy with Cloudflare DNS plugin so either Caddyfile works.
export CADDY_IMAGE="${CADDY_IMAGE:-sylora-caddy:production}"
docker build -f "$PROD_DIR/Dockerfile.caddy" -t "$CADDY_IMAGE" "$PROD_DIR"

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  export CADDY_CONFIG_FILE=/etc/caddy/Caddyfile.cloudflare
else
  export CADDY_CONFIG_FILE=/etc/caddy/Caddyfile
  echo "NOTE: CLOUDFLARE_API_TOKEN empty — using HTTP-01. Keep Cloudflare DNS record DNS-only until cert issues, SSL mode Full."
fi

echo "==> Building images and starting production stack for https://${DOMAIN}"
docker compose --env-file "$ENV_FILE" build
docker compose --env-file "$ENV_FILE" up -d

echo "==> Waiting for HTTPS readiness"
ready=0
for i in $(seq 1 90); do
  if curl -fsS "https://${DOMAIN}/health/ready" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 5
done

if [[ "$ready" -ne 1 ]]; then
  echo "Timed out waiting for https://${DOMAIN}/health/ready" >&2
  docker compose --env-file "$ENV_FILE" ps >&2 || true
  exit 1
fi

echo "READY https://${DOMAIN}"
curl -fsS "https://${DOMAIN}/health/live" || true
echo

# Owner Configuration deploy gate — blocks announce when required secrets missing.
if [[ "${VALIDATE_OWNER_CONFIG:-1}" =~ ^(1|true|yes)$ ]]; then
  echo "==> Validating Owner Configuration credentials for ${APP_ENVIRONMENT}"
  API_CONTAINER="$(docker compose --env-file "$ENV_FILE" ps -q api | head -n1)"
  if [[ -z "$API_CONTAINER" ]]; then
    echo "API container not found for Owner Configuration gate" >&2
    exit 1
  fi
  if ! docker exec "$API_CONTAINER" python -m app.cli validate-owner-config \
    --environment "$APP_ENVIRONMENT"; then
    echo "Owner Configuration deploy gate FAILED — open Admin → Owner services" >&2
    echo "Set VALIDATE_OWNER_CONFIG=0 only for first bootstrap before secrets exist." >&2
    exit 1
  fi
  echo "Owner Configuration deploy gate: READY"
fi

echo "Verify from a phone on mobile data before announcing."
exit 0
