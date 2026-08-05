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

# Ensure MediaMTX control credentials exist for the lite media plane.
if [[ -z "${MEDIAMTX_CONTROL_USERNAME:-}" || -z "${MEDIAMTX_CONTROL_PASSWORD:-}" ]]; then
  echo "Generating MEDIAMTX_CONTROL_* into $ENV_FILE (one-time)"
  MTX_USER="sylora_mtx"
  MTX_PASS="$(openssl rand -hex 24)"
  {
    echo ""
    echo "# MediaMTX lite (added by deploy-parallel.sh)"
    echo "MEDIAMTX_CONTROL_USERNAME=${MTX_USER}"
    echo "MEDIAMTX_CONTROL_PASSWORD=${MTX_PASS}"
    echo "MEDIAMTX_CONTROL_URL=http://mediamtx:9997"
    echo "MEDIAMTX_WHIP_BASE_URL=https://${DOMAIN}/webrtc"
    echo "MEDIAMTX_PLAYBACK_BASE_URL=https://${DOMAIN}/hls"
    echo "MEDIAMTX_WEBRTC_ADDITIONAL_HOSTS=${MEDIAMTX_WEBRTC_ADDITIONAL_HOSTS:-46.225.84.210}"
  } >> "$ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

echo "Project=$PROJECT DOMAIN=$DOMAIN APP_ENVIRONMENT=${APP_ENVIRONMENT:-staging}"
if git -C "$REPO_ROOT" rev-parse HEAD >/dev/null 2>&1; then
  echo "Repo=$REPO_ROOT commit=$(git -C "$REPO_ROOT" rev-parse HEAD)"
  git -C "$REPO_ROOT" rev-parse HEAD > "$REPO_ROOT/apps/sylora/.deploy-commit" || true
else
  echo "Repo=$REPO_ROOT (no .git — using sync deploy)"
fi

docker compose -p "$PROJECT" \
  -f docker-compose.yml \
  -f docker-compose.parallel.yml \
  --env-file "$ENV_FILE" \
  build api-image api

docker compose -p "$PROJECT" \
  -f docker-compose.yml \
  -f docker-compose.parallel.yml \
  --env-file "$ENV_FILE" \
  up -d postgres redis minio mediamtx

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

# Ensure edge nginx can reach MediaMTX + restored web/api.
for ctn in "${PROJECT}-api-1" "${PROJECT}-web-preview-1" "${PROJECT}-mediamtx-1"; do
  docker network connect sylora_default "$ctn" 2>/dev/null || true
done

docker compose -p "$PROJECT" \
  -f docker-compose.yml \
  -f docker-compose.parallel.yml \
  --env-file "$ENV_FILE" \
  ps

echo "Direct checks (loopback only):"
curl -fsS "http://127.0.0.1:18000/health/ready" && echo
curl -fsS -o /dev/null -w "web_preview=%{http_code}\n" "http://127.0.0.1:18080/"
curl -fsS -o /dev/null -w "hls_port=%{http_code}\n" "http://127.0.0.1:8888/" || true
curl -fsS -o /dev/null -w "webrtc_port=%{http_code}\n" "http://127.0.0.1:8889/" || true
curl -fsS "http://127.0.0.1:18000/v1/diagnostics" | head -c 400 || true
echo
