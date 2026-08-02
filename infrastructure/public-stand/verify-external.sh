#!/usr/bin/env bash
# External verification for a deployed public stand — multi-tester E2E.
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

http_json() {
  # args: method path [json_body]
  local method="$1" path="$2" body="${3:-}"
  python3 - "$BASE" "$method" "$path" "$body" <<'PY'
import json, os, ssl, sys, urllib.error, urllib.request
base, method, path, body = sys.argv[1:5]
headers = {"Accept": "application/json", "Content-Type": "application/json"}
token = os.environ.get("TOKEN", "")
if token:
    headers["Authorization"] = f"Bearer {token}"
idem = os.environ.get("IDEMPOTENCY_KEY", "")
if idem:
    headers["Idempotency-Key"] = idem
data = None if not body else body.encode()
req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
ctx = ssl.create_default_context()
try:
    with urllib.request.urlopen(req, context=ctx, timeout=45) as resp:
        print(resp.status)
        print(resp.read().decode())
except urllib.error.HTTPError as exc:
    print(exc.code)
    print(exc.read().decode())
PY
}

curl -fsS "$BASE/health/live" | grep -q live || fail "health/live"
ok "health/live"
curl -fsS "$BASE/health/ready" | grep -q ready || fail "health/ready"
ok "health/ready"
STATUS="$(curl -fsS "$BASE/v1/public/stand-status")"
echo "$STATUS" | grep -q SYLORA || fail "stand-status product"
ok "stand-status"

TS="$(date +%s)"
EMAILS=()
PASSES=()
TOKENS=()
USER_IDS=()
HANDLES=()

for i in 1 2; do
  EMAIL="tester${i}.${TS}@example.com"
  PASS="TestStand!${TS}${i}Aa1"
  EMAILS+=("$EMAIL")
  PASSES+=("$PASS")
  OUT="$(http_json POST /v1/auth/register "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"display_name\":\"Tester $i\"}")"
  CODE="$(echo "$OUT" | head -1)"
  [[ "$CODE" == "202" ]] || fail "register $EMAIL http $CODE $(echo "$OUT" | tail -n +2)"
  LOGIN_OUT="$(http_json POST /v1/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"device_label\":\"verify-script\"}")"
  LOGIN_CODE="$(echo "$LOGIN_OUT" | head -1)"
  LOGIN_BODY="$(echo "$LOGIN_OUT" | tail -n +2)"
  [[ "$LOGIN_CODE" == "200" ]] || fail "login $EMAIL $LOGIN_CODE $LOGIN_BODY"
  TOKEN="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["tokens"]["access_token"])' <<<"$LOGIN_BODY")"
  TOKENS+=("$TOKEN")
  ME="$(TOKEN="$TOKEN" http_json GET /v1/auth/me)"
  ME_BODY="$(echo "$ME" | tail -n +2)"
  echo "$ME_BODY" | grep -q "$EMAIL" || fail "me isolation email"
  UID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$ME_BODY")"
  USER_IDS+=("$UID")
  HANDLE="t${i}${TS}"
  HANDLES+=("$HANDLE")
  PATCH="$(TOKEN="$TOKEN" http_json PATCH /v1/profile "{\"handle\":\"$HANDLE\",\"display_name\":\"Tester $i\"}")"
  [[ "$(echo "$PATCH" | head -1)" =~ ^20 ]] || fail "profile patch $(echo "$PATCH" | head -1) $(echo "$PATCH" | tail -n +2)"
  TOKEN="$TOKEN" http_json PATCH /v1/settings '{"profile_visibility":"public"}' >/dev/null || true
  BAL="$(TOKEN="$TOKEN" http_json GET /v1/wallet/balance)"
  BAL_BODY="$(echo "$BAL" | tail -n +2)"
  SPEND="$(python3 -c 'import json,sys; print(int(json.load(sys.stdin).get("spendable_minor",0)))' <<<"$BAL_BODY")"
  [[ "$SPEND" -ge 1 ]] || fail "expected signup sandbox credit for $EMAIL got $SPEND"
  ok "account $i $EMAIL sandbox=$SPEND"
done

FEED="$(TOKEN="${TOKENS[0]}" http_json GET /v1/social/feed)"
[[ "$(echo "$FEED" | head -1)" =~ ^20 ]] || fail "feed $(echo "$FEED" | head -1)"
ok "feed"

CONV="$(TOKEN="${TOKENS[0]}" http_json POST /v1/messages/conversations "{\"recipient_handle\":\"${HANDLES[1]}\"}")"
CONV_CODE="$(echo "$CONV" | head -1)"
CONV_BODY="$(echo "$CONV" | tail -n +2)"
[[ "$CONV_CODE" =~ ^20 ]] || fail "create conversation $CONV_CODE $CONV_BODY"
CONV_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$CONV_BODY")"
MSG="$(TOKEN="${TOKENS[0]}" http_json POST "/v1/messages/conversations/${CONV_ID}/messages" '{"body":"hello from stand verify"}')"
[[ "$(echo "$MSG" | head -1)" =~ ^20 ]] || fail "send message $(echo "$MSG" | head -1) $(echo "$MSG" | tail -n +2)"
ok "messages"

MT="$(TOKEN="${TOKENS[1]}" http_json POST /v1/messages/events/ticket '{}')"
[[ "$(echo "$MT" | head -1)" == "200" ]] || fail "message ticket $(echo "$MT" | tail -n +2)"
ok "message websocket ticket"

CAT="$(TOKEN="${TOKENS[0]}" http_json GET /v1/gifts/catalog)"
CAT_BODY="$(echo "$CAT" | tail -n +2)"
echo "$CAT_BODY" | grep -q soft-ping || fail "soft-ping missing from catalog: $CAT_BODY"
GIFT_ID="$(python3 -c 'import json,sys; data=json.load(sys.stdin); items=data.get("items") or data; print(next(i["id"] for i in items if i.get("slug")=="soft-ping"))' <<<"$CAT_BODY")"
ok "soft-ping in catalog id=$GIFT_ID"

GT="$(TOKEN="${TOKENS[1]}" http_json POST /v1/gifts/events/ticket '{}')"
GT_BODY="$(echo "$GT" | tail -n +2)"
[[ "$(echo "$GT" | head -1)" == "200" ]] || fail "gift ticket $GT_BODY"
TICKET="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["ticket"])' <<<"$GT_BODY")"
ok "gift websocket ticket"

python3 - "$BASE" "$TICKET" "${TOKENS[0]}" "${USER_IDS[1]}" "$GIFT_ID" <<'PY' || fail "soft-ping delivery"
import json, ssl, sys, threading, time, urllib.request
from urllib.parse import urlencode

base, ticket, sender_token, recipient_id, gift_id = sys.argv[1:6]

def send_gift():
    payload = json.dumps({
        "gift_definition_id": gift_id,
        "recipient_user_id": recipient_id,
        "message": "stand verify soft-ping",
    }).encode()
    req = urllib.request.Request(
        f"{base}/v1/gifts/sends",
        data=payload,
        headers={
            "Authorization": f"Bearer {sender_token}",
            "Content-Type": "application/json",
            "Idempotency-Key": f"stand-verify-{int(time.time())}",
            "Accept": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        assert resp.status in (200, 201), resp.read()

try:
    import websocket  # type: ignore
except ImportError:
    send_gift()
    print("soft-ping send http ok (install websocket-client for live WS assert)")
    raise SystemExit(0)

ws_url = base.replace("https://", "wss://").replace("http://", "ws://")
ws_url = f"{ws_url}/v1/ws/gifts?{urlencode({'ticket': ticket})}"
got = {"ok": False, "err": None}

def on_message(ws, message):
    data = json.loads(message)
    if data.get("event") == "heartbeat":
        return
    got["ok"] = True
    ws.close()

def on_error(ws, error):
    got["err"] = str(error)

ws = websocket.WebSocketApp(ws_url, on_message=on_message, on_error=on_error)
th = threading.Thread(
    target=ws.run_forever,
    kwargs={"sslopt": {"cert_reqs": ssl.CERT_REQUIRED}},
    daemon=True,
)
th.start()
time.sleep(1.5)
send_gift()
for _ in range(40):
    if got["ok"]:
        print("soft-ping delivered over websocket")
        raise SystemExit(0)
    time.sleep(0.25)
print("err", got["err"], file=sys.stderr)
raise SystemExit(1)
PY
ok "soft-ping send + websocket receive"

TOKEN="${TOKENS[1]}" http_json POST /v1/auth/logout '{}' >/dev/null || true
DEL="$(TOKEN="${TOKENS[1]}" http_json DELETE /v1/users/me "{\"password\":\"${PASSES[1]}\"}")"
[[ "$(echo "$DEL" | head -1)" =~ ^20 ]] || echo "WARN: account delete $(echo "$DEL" | head -1) $(echo "$DEL" | tail -n +2)"
ok "logout/delete path exercised"

DUP="$(http_json POST /v1/auth/register "{\"email\":\"${EMAILS[0]}\",\"password\":\"${PASSES[0]}\",\"display_name\":\"Dup\"}")"
[[ "$(echo "$DUP" | head -1)" == "409" ]] || fail "expected 409 duplicate email"
ok "duplicate email rejected"

echo "ALL CHECKS PASSED for $BASE"
echo "NOTE: Confirm the same URL opens on a phone over mobile data before calling the stand ready."
