#!/usr/bin/env bash
# Build/start the restored SYLORA stack in parallel with the live dashboard.
# Does NOT bind :80/:443 and does NOT change Cloudflare DNS.
set -euo pipefail

PROD_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$PROD_DIR/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$PROD_DIR/.env}"
PROJECT="${COMPOSE_PROJECT_NAME:-sylora-restored}"

cd "$PROD_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run generate-secrets.sh then fill DOMAIN / S3 / optional OPENAI_API_KEY" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

: "${DOMAIN:?DOMAIN required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
: "${REDIS_PASSWORD:?REDIS_PASSWORD required}"
: "${JWT_SECRET:?JWT_SECRET required}"
: "${DATA_ENCRYPTION_KEY:?DATA_ENCRYPTION_KEY required}"
: "${IP_HASH_KEY:?IP_HASH_KEY required}"
: "${S3_ACCESS_KEY_ID:?S3_ACCESS_KEY_ID required}"
: "${S3_SECRET_ACCESS_KEY:?S3_SECRET_ACCESS_KEY required}"

echo "Project=$PROJECT DOMAIN=$DOMAIN APP_ENVIRONMENT=${APP_ENVIRONMENT:-staging}"
echo "Repo=$REPO_ROOT commit=$(git -C "$REPO_ROOT" rev-parse HEAD)"

docker compose -p "$PROJECT" \
  -f docker-compose.yml \
  -f docker-compose.parallel.yml \
  --env-file "$ENV_FILE" \
  build api-image api

docker compose -p "$PROJECT" \
  -f docker-compose.yml \
  -f docker-compose.parallel.yml \
  --env-file "$ENV_FILE" \
  up -d postgres redis minio

docker compose -p "$PROJECT" \
  -f docker-compose.yml \
  -f docker-compose.parallel.yml \
  --env-file "$ENV_FILE" \
  up minio-init migrate

docker compose -p "$PROJECT" \
  -f docker-compose.yml \
  -f docker-compose.parallel.yml \
  --env-file "$ENV_FILE" \
  up -d api

echo "Building Flutter web (one-shot)…"
docker compose -p "$PROJECT" \
  -f docker-compose.yml \
  -f docker-compose.parallel.yml \
  --env-file "$ENV_FILE" \
  up web

docker compose -p "$PROJECT" \
  -f docker-compose.yml \
  -f docker-compose.parallel.yml \
  --env-file "$ENV_FILE" \
  up -d web-preview

docker compose -p "$PROJECT" \
  -f docker-compose.yml \
  -f docker-compose.parallel.yml \
  --env-file "$ENV_FILE" \
  ps

echo "Direct checks (loopback only):"
curl -fsS "http://127.0.0.1:18000/health/ready" && echo
curl -fsS -o /dev/null -w "web_preview=%{http_code}\n" "http://127.0.0.1:18080/"
