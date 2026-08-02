#!/usr/bin/env bash
# Periodic PostgreSQL → R2/S3 backups inside the backup container.
set -euo pipefail

CRON="${BACKUP_CRON:-0 */6 * * *}"
echo "backup-loop starting; schedule=${CRON}"

run_once() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] starting backup"
  if /usr/local/bin/backup-postgres.sh; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] backup ok"
  else
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] backup FAILED" >&2
  fi
}

# Immediate warm backup after boot, then interval loop approximating cron.
run_once
# Default every 6 hours if supercronic unavailable.
INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-21600}"
while true; do
  sleep "${INTERVAL_SECONDS}"
  run_once
done
