#!/usr/bin/env bash
# Ensure origin TLS material exists for Cloudflare Full / Full (strict).
# Preference order:
#   1) Existing Let's Encrypt / installed fullchain+privkey
#   2) Cloudflare Origin CA files (origin.pem / origin.key)
#   3) Self-signed bootstrap (Full only; replace ASAP for Full strict)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CERT_DIR="${ROOT}/infrastructure/nginx/certs"
mkdir -p "${CERT_DIR}"

install_pair() {
  local cert="$1" key="$2" label="$3"
  install -m 644 "${cert}" "${CERT_DIR}/fullchain.pem"
  install -m 600 "${key}" "${CERT_DIR}/privkey.pem"
  echo "Installed ${label}"
  openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -subject -issuer -dates -ext subjectAltName || true
}

if [[ -f /etc/letsencrypt/live/getsylora.com/fullchain.pem && -f /etc/letsencrypt/live/getsylora.com/privkey.pem ]]; then
  install_pair \
    /etc/letsencrypt/live/getsylora.com/fullchain.pem \
    /etc/letsencrypt/live/getsylora.com/privkey.pem \
    "Let's Encrypt certs"
  exit 0
fi

if [[ -f "${CERT_DIR}/letsencrypt-fullchain.pem" && -f "${CERT_DIR}/letsencrypt-privkey.pem" ]]; then
  install_pair \
    "${CERT_DIR}/letsencrypt-fullchain.pem" \
    "${CERT_DIR}/letsencrypt-privkey.pem" \
    "cached Let's Encrypt certs"
  exit 0
fi

if [[ -f "${CERT_DIR}/origin.pem" && -f "${CERT_DIR}/origin.key" ]]; then
  install_pair "${CERT_DIR}/origin.pem" "${CERT_DIR}/origin.key" "Cloudflare Origin CA certs"
  exit 0
fi

if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
  echo "TLS certs already present in ${CERT_DIR}"
  openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -subject -issuer -dates -ext subjectAltName || true
  # If current cert lacks www SAN, regenerate bootstrap self-signed.
  if openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -text | grep -q 'DNS:www.getsylora.com'; then
    exit 0
  fi
  echo "Existing cert missing www.getsylora.com SAN; regenerating bootstrap cert"
fi

echo "Generating self-signed origin certificate for getsylora.com + www.getsylora.com"
openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout "${CERT_DIR}/privkey.pem" \
  -out "${CERT_DIR}/fullchain.pem" \
  -subj "/CN=getsylora.com" \
  -addext "subjectAltName=DNS:getsylora.com,DNS:www.getsylora.com,IP:46.225.84.210"
chmod 644 "${CERT_DIR}/fullchain.pem"
chmod 600 "${CERT_DIR}/privkey.pem"
openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -subject -dates -ext subjectAltName
echo "Self-signed bootstrap ready. Run ./infrastructure/scripts/issue-origin-cert.sh for Full (strict)."
