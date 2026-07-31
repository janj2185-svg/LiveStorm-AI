#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
umask 077

: "${PGHOST:?PGHOST is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${BACKUP_URI:?BACKUP_URI must be an s3:// URI}"

PGPORT="${PGPORT:-5432}"
expected_confirmation="RESTORE ${PGDATABASE}"

if [[ "${RESTORE_CONFIRMATION:-}" != "${expected_confirmation}" ]]; then
  if [[ -t 0 ]]; then
    printf 'This will replace objects in database %s on %s.\n' "${PGDATABASE}" "${PGHOST}" >&2
    printf 'Type exactly "%s" to continue: ' "${expected_confirmation}" >&2
    IFS= read -r confirmation
  else
    confirmation="${RESTORE_CONFIRMATION:-}"
  fi
  if [[ "${confirmation}" != "${expected_confirmation}" ]]; then
    printf 'Restore cancelled; confirmation did not match.\n' >&2
    exit 2
  fi
fi

for command_name in aws sha256sum pg_restore; do
  command -v "${command_name}" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "${command_name}" >&2
    exit 1
  }
done

endpoint_args=()
if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then
  endpoint_args+=(--endpoint-url "${AWS_ENDPOINT_URL}")
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

payload_name="${BACKUP_URI##*/}"
if [[ -z "${payload_name}" || "${payload_name}" == "${BACKUP_URI}" ]]; then
  printf 'BACKUP_URI must identify an object beneath an s3:// bucket\n' >&2
  exit 1
fi

payload="${tmpdir}/${payload_name}"
checksum="${tmpdir}/${payload_name}.sha256"
printf 'Downloading backup and checksum\n'
aws "${endpoint_args[@]}" s3 cp "${BACKUP_URI}" "${payload}"
aws "${endpoint_args[@]}" s3 cp "${BACKUP_URI}.sha256" "${checksum}"

(
  cd "${tmpdir}"
  sha256sum --check "${payload_name}.sha256"
)

archive="${payload}"
case "${payload_name}" in
  *.age)
    : "${AGE_IDENTITY_FILE:?AGE_IDENTITY_FILE is required for an age-encrypted backup}"
    command -v age >/dev/null 2>&1 || {
      printf 'Required command not found: age\n' >&2
      exit 1
    }
    archive="${tmpdir}/${payload_name%.age}"
    age --decrypt --identity "${AGE_IDENTITY_FILE}" --output "${archive}" "${payload}"
    ;;
  *.gpg)
    command -v gpg >/dev/null 2>&1 || {
      printf 'Required command not found: gpg\n' >&2
      exit 1
    }
    archive="${tmpdir}/${payload_name%.gpg}"
    gpg --batch --decrypt --output "${archive}" "${payload}"
    ;;
esac

printf 'Validating custom-format archive\n'
pg_restore --list "${archive}" >/dev/null

printf 'Restoring database %s on %s\n' "${PGDATABASE}" "${PGHOST}"
pg_restore \
  --host="${PGHOST}" \
  --port="${PGPORT}" \
  --username="${PGUSER}" \
  --dbname="${PGDATABASE}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --exit-on-error \
  "${archive}"

printf 'Restore completed for %s\n' "${PGDATABASE}"
