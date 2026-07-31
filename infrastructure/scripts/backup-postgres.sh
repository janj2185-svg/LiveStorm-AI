#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
umask 077

: "${PGHOST:?PGHOST is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${S3_BUCKET:?S3_BUCKET is required}"

PGPORT="${PGPORT:-5432}"
S3_PREFIX="${S3_PREFIX:-postgres/${PGDATABASE}}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_ENCRYPTION="${BACKUP_ENCRYPTION:-none}"

for command_name in pg_dump aws sha256sum python3; do
  command -v "${command_name}" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "${command_name}" >&2
    exit 1
  }
done

if ! [[ "${BACKUP_RETENTION_DAYS}" =~ ^[1-9][0-9]*$ ]]; then
  printf 'BACKUP_RETENTION_DAYS must be a positive integer\n' >&2
  exit 1
fi

endpoint_args=()
if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then
  endpoint_args+=(--endpoint-url "${AWS_ENDPOINT_URL}")
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="${tmpdir}/${PGDATABASE}_${timestamp}.dump"

printf 'Creating PostgreSQL custom-format backup for %s\n' "${PGDATABASE}"
pg_dump \
  --host="${PGHOST}" \
  --port="${PGPORT}" \
  --username="${PGUSER}" \
  --dbname="${PGDATABASE}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="${archive}"

payload="${archive}"
case "${BACKUP_ENCRYPTION}" in
  none)
    ;;
  age)
    : "${AGE_RECIPIENT:?AGE_RECIPIENT is required when BACKUP_ENCRYPTION=age}"
    command -v age >/dev/null 2>&1 || {
      printf 'Required command not found: age\n' >&2
      exit 1
    }
    payload="${archive}.age"
    age --encrypt --recipient "${AGE_RECIPIENT}" --output "${payload}" "${archive}"
    ;;
  gpg)
    : "${GPG_RECIPIENT:?GPG_RECIPIENT is required when BACKUP_ENCRYPTION=gpg}"
    command -v gpg >/dev/null 2>&1 || {
      printf 'Required command not found: gpg\n' >&2
      exit 1
    }
    payload="${archive}.gpg"
    gpg --batch --yes --encrypt --recipient "${GPG_RECIPIENT}" --output "${payload}" "${archive}"
    ;;
  *)
    printf 'BACKUP_ENCRYPTION must be one of: none, age, gpg\n' >&2
    exit 1
    ;;
esac

payload_name="$(basename "${payload}")"
checksum="${tmpdir}/${payload_name}.sha256"
(
  cd "${tmpdir}"
  sha256sum "${payload_name}" > "${payload_name}.sha256"
)

destination="s3://${S3_BUCKET}/${S3_PREFIX%/}/${payload_name}"
checksum_value="$(awk '{print $1}' "${checksum}")"
upload_args=()
if [[ -n "${S3_SERVER_SIDE_ENCRYPTION:-}" ]]; then
  upload_args+=(--sse "${S3_SERVER_SIDE_ENCRYPTION}")
fi

printf 'Uploading encrypted payload and checksum to %s\n' "${destination}"
aws "${endpoint_args[@]}" s3 cp "${payload}" "${destination}" \
  "${upload_args[@]}" \
  --metadata "sha256=${checksum_value},database=${PGDATABASE}"
aws "${endpoint_args[@]}" s3 cp "${checksum}" "${destination}.sha256" "${upload_args[@]}"

manifest="${tmpdir}/objects.json"
expired="${tmpdir}/expired-objects.txt"
aws "${endpoint_args[@]}" s3api list-objects-v2 \
  --bucket "${S3_BUCKET}" \
  --prefix "${S3_PREFIX%/}/" \
  --output json > "${manifest}"

python3 - "${manifest}" "${BACKUP_RETENTION_DAYS}" > "${expired}" <<'PY'
import datetime
import json
import pathlib
import sys

manifest_path = pathlib.Path(sys.argv[1])
retention_days = int(sys.argv[2])
cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=retention_days)
data = json.loads(manifest_path.read_text(encoding="utf-8"))
for item in data.get("Contents", []):
    modified = datetime.datetime.fromisoformat(item["LastModified"].replace("Z", "+00:00"))
    key = item["Key"]
    if modified < cutoff:
        if "\n" in key or "\r" in key:
            raise SystemExit("Refusing to process an object key containing a newline")
        print(key)
PY

while IFS= read -r expired_key; do
  [[ -n "${expired_key}" ]] || continue
  printf 'Deleting expired backup object s3://%s/%s\n' "${S3_BUCKET}" "${expired_key}"
  aws "${endpoint_args[@]}" s3 rm "s3://${S3_BUCKET}/${expired_key}"
done < "${expired}"

printf 'Backup completed: %s\n' "${destination}"
