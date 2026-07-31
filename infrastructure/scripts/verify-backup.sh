#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
umask 077

: "${BACKUP_URI:?BACKUP_URI must be an s3:// URI}"

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

toc="${tmpdir}/toc.txt"
pg_restore --list "${archive}" > "${toc}"
entry_count="$(awk '!/^;/ && NF {count += 1} END {print count + 0}' "${toc}")"
if (( entry_count < 1 )); then
  printf 'Backup archive contains no restore entries\n' >&2
  exit 1
fi

# Force pg_restore to read and decompress the complete archive without
# connecting to a database. A real restore drill is still required.
pg_restore --no-owner --no-privileges --file=/dev/null "${archive}"

printf 'Backup checksum, archive catalog, and full archive stream verified (%s entries).\n' "${entry_count}"
printf 'No database restore was attempted by this verification.\n'
