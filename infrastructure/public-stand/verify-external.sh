#!/usr/bin/env bash
# External verification for a deployed public stand.
set -euo pipefail
BASE="${1:?Usage: $0 https://stand.example.com}"
BASE="${BASE%/}"

fail() { echo "FAIL: $*" >&2; exit 1; }
ok() { echo "OK: $*"; }

case "$BASE" in
  https://*) ;;
  *) fail "URL must be https:// (got $BASE)" ;;
esac
case "$BASE" in
  *localhost*|*127.0.0.1*|*.cursor.*|*trycloudflare*) fail "Refusing agent/local temporary URLs" ;;
esac

curl -fsS "$BASE/health/live" | grep -q live || fail "health/live"
ok "health/live"
curl -fsS "$BASE/health/ready" | grep -q ready || fail "health/ready"
ok "health/ready"
STATUS="$(curl -fsS "$BASE/v1/public/stand-status")"
echo "$STATUS" | grep -q '"product":"SYLORA\|"product": "SYLORA"' || fail "stand-status product"
echo "$STATUS" | grep -q BLOCKED_BY_PROVIDER_ACCESS || echo "WARN: tiktok blocked status string not found"
ok "stand-status"

# Register 3 unique accounts
TS="$(date +%s)"
for i in 1 2 3; do
  EMAIL="tester${i}.${TS}@example.com"
  PASS="TestStand!${TS}${i}Aa"
  CODE="$(curl -sS -o /tmp/reg.json -w '%{http_code}' -X POST "$BASE/v1/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"display_name\":\"Tester $i\"}")"
  [[ "$CODE" == "202" ]] || fail "register $EMAIL http $CODE $(cat /tmp/reg.json)"
  LOGIN="$(curl -fsS -X POST "$BASE/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"device_label\":\"verify-script\"}")"
  echo "$LOGIN" | grep -q access_token || fail "login $EMAIL"
  TOKEN="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])' <<<"$LOGIN")"
  ME="$(curl -fsS "$BASE/v1/auth/me" -H "Authorization: Bearer $TOKEN")"
  echo "$ME" | grep -q "$EMAIL" || fail "me isolation email"
  # Wrong password
  BAD="$(curl -sS -o /tmp/bad.json -w '%{http_code}' -X POST "$BASE/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"wrong-password-XXX\",\"device_label\":\"verify\"}")"
  [[ "$BAD" == "401" ]] || fail "expected 401 for bad password"
  ok "account $i $EMAIL"
done

# Duplicate email
DUP="$(curl -sS -o /tmp/dup.json -w '%{http_code}' -X POST "$BASE/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"tester1.${TS}@example.com\",\"password\":\"TestStand!${TS}1Aa\",\"display_name\":\"Dup\"}")"
[[ "$DUP" == "409" ]] || fail "expected 409 duplicate email got $DUP"
ok "duplicate email rejected"

echo "ALL CHECKS PASSED for $BASE"
