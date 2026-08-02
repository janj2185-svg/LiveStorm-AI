#!/usr/bin/env bash
# Zero-downtime rolling update for SYLORA production (API dual replica + web).
set -euo pipefail
PROD_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${1:-$PROD_DIR/.env}"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
: "${DOMAIN:?DOMAIN required}"

cd "$PROD_DIR"
export IMAGE_TAG="${IMAGE_TAG:-production}"

echo "==> Building new API image (${IMAGE_TAG})"
docker compose --env-file "$ENV_FILE" build api api-image

echo "==> Running migrations"
docker compose --env-file "$ENV_FILE" run --rm migrate

echo "==> Rolling API replica 1 (api2 keeps serving)"
docker compose --env-file "$ENV_FILE" up -d --no-deps --force-recreate api
for i in $(seq 1 60); do
  if docker compose --env-file "$ENV_FILE" exec -T api \
    python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=3)" \
    >/dev/null 2>&1; then
    echo "api healthy"
    break
  fi
  sleep 3
  [[ "$i" -eq 60 ]] && { echo "api failed health" >&2; exit 1; }
done

echo "==> Rolling API replica 2"
docker compose --env-file "$ENV_FILE" up -d --no-deps --force-recreate api2
for i in $(seq 1 60); do
  if docker compose --env-file "$ENV_FILE" exec -T api2 \
    python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=3)" \
    >/dev/null 2>&1; then
    echo "api2 healthy"
    break
  fi
  sleep 3
  [[ "$i" -eq 60 ]] && { echo "api2 failed health" >&2; exit 1; }
done

echo "==> Rebuilding Flutter web assets (Caddy keeps serving old files until swap completes)"
docker compose --env-file "$ENV_FILE" run --rm web

echo "==> Reloading Caddy config (no downtime)"
docker compose --env-file "$ENV_FILE" exec -T caddy caddy reload --config /etc/caddy/Caddyfile || \
  docker compose --env-file "$ENV_FILE" up -d --no-deps caddy

echo "==> External readiness"
curl -fsS "https://${DOMAIN}/health/ready" >/dev/null
curl -fsS "https://${DOMAIN}/health/live" >/dev/null
echo "UPDATE OK — https://${DOMAIN}"
