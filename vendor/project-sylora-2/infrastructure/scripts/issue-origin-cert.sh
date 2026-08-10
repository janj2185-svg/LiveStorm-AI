#!/usr/bin/env bash
# Issue / renew a publicly trusted origin certificate for:
#   - getsylora.com
#   - www.getsylora.com
# Compatible with Cloudflare SSL mode Full (strict).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CERT_DIR="${ROOT}/infrastructure/nginx/certs"
WEBROOT="${ROOT}/infrastructure/nginx/certbot"
EMAIL="${CERTBOT_EMAIL:-admin@getsylora.com}"
DOMAINS=(getsylora.com www.getsylora.com)

mkdir -p "${CERT_DIR}" "${WEBROOT}/.well-known/acme-challenge"
chmod 755 "${WEBROOT}" "${WEBROOT}/.well-known" "${WEBROOT}/.well-known/acme-challenge"

if ! command -v certbot >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y certbot
fi

# Ensure nginx is serving the updated config (ACME on :80 and :443).
cd "${ROOT}"
docker compose up -d web
sleep 2

PROBE="sylora-acme-probe-$(date +%s)"
echo "probe-ok" > "${WEBROOT}/.well-known/acme-challenge/${PROBE}"
for host in getsylora.com www.getsylora.com; do
  code="$(curl -fsS -o /tmp/acme-probe.out -w '%{http_code}' "http://${host}/.well-known/acme-challenge/${PROBE}" || true)"
  body="$(cat /tmp/acme-probe.out 2>/dev/null || true)"
  if [[ "${code}" != "200" || "${body}" != "probe-ok" ]]; then
    echo "ACME HTTP probe failed for http://${host}/.well-known/acme-challenge/${PROBE} (code=${code})"
    exit 1
  fi
  echo "OK ACME probe ${host}"
done
rm -f "${WEBROOT}/.well-known/acme-challenge/${PROBE}"

certbot certonly \
  --webroot \
  -w "${WEBROOT}" \
  --agree-tos \
  --non-interactive \
  --email "${EMAIL}" \
  --keep-until-expiring \
  --expand \
  -d getsylora.com \
  -d www.getsylora.com

LIVE_DIR="/etc/letsencrypt/live/getsylora.com"
if [[ ! -f "${LIVE_DIR}/fullchain.pem" || ! -f "${LIVE_DIR}/privkey.pem" ]]; then
  echo "Let's Encrypt live certs not found in ${LIVE_DIR}"
  exit 1
fi

install -m 644 "${LIVE_DIR}/fullchain.pem" "${CERT_DIR}/fullchain.pem"
install -m 600 "${LIVE_DIR}/privkey.pem" "${CERT_DIR}/privkey.pem"

# Keep copies recognizable for ops.
install -m 644 "${LIVE_DIR}/fullchain.pem" "${CERT_DIR}/letsencrypt-fullchain.pem"
install -m 600 "${LIVE_DIR}/privkey.pem" "${CERT_DIR}/letsencrypt-privkey.pem"

openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -subject -issuer -dates -ext subjectAltName

docker compose up -d --force-recreate web
sleep 2
docker compose exec -T web nginx -t
docker compose exec -T web nginx -s reload || true

echo "ORIGIN_CERT_INSTALLED"
for host in "${DOMAINS[@]}"; do
  echo | openssl s_client -connect 127.0.0.1:443 -servername "${host}" 2>/dev/null \
    | openssl x509 -noout -subject -issuer -ext subjectAltName
done
