#!/usr/bin/env bash
set -euo pipefail
fail=0
pass() { echo "OK  $1"; }
bad() { echo "FAIL $1"; fail=1; }

check_host() {
  local host="$1"
  local tmp
  tmp="$(mktemp)"
  if ! echo | openssl s_client -connect "${host}:443" -servername "${host}" 2>/dev/null \
    | openssl x509 -noout -text >"${tmp}"; then
    bad "${host} certificate fetch"
    rm -f "${tmp}"
    return
  fi
  if grep -Eq "DNS:${host}|DNS:\\*\\.getsylora\\.com" "${tmp}"; then
    pass "${host} SAN covers host"
  else
    bad "${host} SAN missing"
    grep -E "Subject:|DNS:" "${tmp}" || true
  fi
  if grep -Eqi "Let's Encrypt|R[0-9]+|E[0-9]+|CloudFlare Origin|Google Trust Services" "${tmp}"; then
    pass "${host} trusted issuer present in chain/view"
  else
    # For direct origin checks issuer may be Let's Encrypt; for CF edge Google Trust.
    issuer="$(grep -m1 'Issuer:' "${tmp}" || true)"
    echo "INFO ${host} issuer: ${issuer}"
  fi
  code="$(curl -fsS -o /dev/null -w '%{http_code}' "https://${host}/" || true)"
  if [[ "${code}" == "200" ]]; then
    pass "${host} https 200"
  else
    bad "${host} https (code=${code})"
  fi
  # Verify browser-grade trust from this host
  if curl -fsS "https://${host}/" >/dev/null; then
    pass "${host} TLS verify via curl"
  else
    bad "${host} TLS verify via curl"
  fi
  rm -f "${tmp}"
}

check_host getsylora.com
check_host www.getsylora.com

# Origin direct check (Full strict cares about this)
if [[ -f /root/Sylora/infrastructure/nginx/certs/fullchain.pem ]]; then
  if openssl x509 -in /root/Sylora/infrastructure/nginx/certs/fullchain.pem -noout -text \
    | grep -q 'DNS:www.getsylora.com' \
    && openssl x509 -in /root/Sylora/infrastructure/nginx/certs/fullchain.pem -noout -text \
    | grep -q 'DNS:getsylora.com'; then
    pass "origin cert SAN includes apex and www"
  else
    bad "origin cert SAN incomplete"
  fi
  if openssl x509 -in /root/Sylora/infrastructure/nginx/certs/fullchain.pem -noout -issuer \
    | grep -Eqi 'Let.s Encrypt|CloudFlare'; then
    pass "origin cert issuer is Full-strict compatible"
  else
    bad "origin cert issuer not Full-strict compatible"
    openssl x509 -in /root/Sylora/infrastructure/nginx/certs/fullchain.pem -noout -issuer || true
  fi
fi

exit "${fail}"
