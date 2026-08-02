#!/usr/bin/env bash
# Restore PostgreSQL from an R2/S3 backup object (s3://bucket/key).
# WARNING: brief write downtime while API replicas are stopped.
set -euo pipefail
PROD_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$PROD_DIR/../.." && pwd)"
ENV_FILE="${1:-$PROD_DIR/.env}"
BACKUP_URI="${2:?Usage: $0 [.env] s3://bucket/path/file.dump}"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

export AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:-$S3_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:-$S3_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"
export AWS_ENDPOINT_URL="${BACKUP_S3_ENDPOINT_URL:-$S3_ENDPOINT_URL}"
export BACKUP_URI
export RESTORE_CONFIRMATION="${RESTORE_CONFIRMATION:-RESTORE ${POSTGRES_DB}}"

cd "$PROD_DIR"
echo "Stopping API replicas during restore"
docker compose --env-file "$ENV_FILE" stop api api2

docker compose --env-file "$ENV_FILE" run --rm \
  -v "$ROOT/infrastructure/scripts/restore-postgres.sh:/usr/local/bin/restore-postgres.sh:ro" \
  -e PGHOST=postgres \
  -e PGPORT=5432 \
  -e "PGDATABASE=${POSTGRES_DB}" \
  -e "PGUSER=${POSTGRES_USER}" \
  -e "PGPASSWORD=${POSTGRES_PASSWORD}" \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION \
  -e AWS_ENDPOINT_URL \
  -e BACKUP_URI \
  -e RESTORE_CONFIRMATION \
  --entrypoint /bin/bash \
  backup \
  -lc 'apk add --no-cache aws-cli bash curl ca-certificates >/dev/null; bash /usr/local/bin/restore-postgres.sh'

docker compose --env-file "$ENV_FILE" up -d api api2
echo "Restore finished. Check https://${DOMAIN}/health/ready"
