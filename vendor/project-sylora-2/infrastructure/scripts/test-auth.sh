#!/usr/bin/env bash
# Auth + frontend smoke checks for a running Sylora stack.
set -euo pipefail
BASE_URL="${1:-http://127.0.0.1}"
fail=0
pass() { echo "OK  $1"; }
bad() { echo "FAIL $1"; fail=1; }

check_code() {
  local name="$1" url="$2" expected="$3"
  local code
  code="$(curl -kfsS -o /tmp/sylora-auth-body -w '%{http_code}' -L --max-redirs 0 "$url" 2>/dev/null || curl -ksS -o /tmp/sylora-auth-body -w '%{http_code}' --max-redirs 0 "$url")"
  if [[ "$code" == "$expected" ]]; then
    pass "$name ($code)"
  else
    bad "$name (expected $expected, got $code)"
  fi
}

check_code "landing" "${BASE_URL}/" "200"
check_code "login_page" "${BASE_URL}/login" "200"
# Unauthenticated /app should redirect to login
app_headers="$(curl -ksS -D - -o /dev/null --max-redirs 0 "${BASE_URL}/app" || true)"
if echo "$app_headers" | grep -qiE 'HTTP/.* (307|302|303)'; then
  if echo "$app_headers" | grep -qi 'location:.*login'; then
    pass "app_redirects_to_login"
  else
    bad "app_redirect_missing_login_location"
    echo "$app_headers" | head -20
  fi
else
  bad "app_did_not_redirect"
  echo "$app_headers" | head -20
fi

if curl -kfsS "${BASE_URL}/login" | grep -Fq "Увійти з Google" \
  && curl -kfsS "${BASE_URL}/login" | grep -Fq "Увійти з GitHub"; then
  pass "login_oauth_buttons"
else
  bad "login_oauth_buttons"
fi

if curl -kfsS "${BASE_URL}/health" | grep -Fq 'sylora-api'; then
  pass "api_health"
else
  bad "api_health"
fi

# Auth.js route should respond (providers listing / csrf)
auth_code="$(curl -ksS -o /dev/null -w '%{http_code}' "${BASE_URL}/api/auth/providers")"
if [[ "$auth_code" == "200" ]]; then
  pass "auth_providers_endpoint"
  curl -kfsS "${BASE_URL}/api/auth/providers" | tee /tmp/sylora-providers.json >/dev/null
  if grep -Eq '"google"|"github"' /tmp/sylora-providers.json; then
    pass "auth_providers_include_google_github"
  else
    bad "auth_providers_include_google_github"
  fi
else
  bad "auth_providers_endpoint ($auth_code)"
fi

exit "$fail"
