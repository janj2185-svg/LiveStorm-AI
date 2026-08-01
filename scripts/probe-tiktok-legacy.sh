#!/usr/bin/env bash
# Probe legacy LiveStorm TikTok LIVE connectivity WITHOUT using the demo simulator.
# Exit codes:
#   0 = connected and at least one real chat/gift/like/follow/member event observed
#   1 = connect failed / offline / empty im/fetch
#   2 = dependency install/runtime failure
#   3 = connected but no events in the observation window
set -euo pipefail

USERNAME="${1:-jan85oks}"
USERNAME="${USERNAME#@}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${SYLORA_TIKTOK_PROBE_DIR:-$ROOT/.sylora-local/tiktok-audit}"
mkdir -p "$OUT_DIR"
PROBE_DIR="${TMPDIR:-/tmp}/sylora-tiktok-probe-$$"
mkdir -p "$PROBE_DIR"
cleanup() { rm -rf "$PROBE_DIR"; }
trap cleanup EXIT

echo "=== SYLORA TikTok legacy probe (no simulator) ==="
echo "username=@$USERNAME"
echo "out=$OUT_DIR"
echo "TIKTOK_MODE(leftover)=${TIKTOK_MODE:-unset}"
echo "LIVE_PROVIDER=${LIVE_PROVIDER:-unset}"
if [[ -n "${TIKTOOL_API_KEY:-}" ]]; then
  echo "TIKTOOL_API_KEY=PRESENT len=${#TIKTOOL_API_KEY}"
else
  echo "TIKTOOL_API_KEY=ABSENT"
fi

cd "$PROBE_DIR"
npm init -y >/dev/null 2>&1
npm pkg set type=module >/dev/null
npm install tiktok-live-connector@2.1.1-beta1 --no-fund --no-audit \
  >"$OUT_DIR/npm-install.log" 2>&1 || {
  echo "PROBE_RESULT=DEPENDENCY_INSTALL_FAILED" >&2
  exit 2
}

# Write probe as .mjs to avoid shell-quoting pitfalls.
cat > "$PROBE_DIR/probe.mjs" <<'EOF'
import { WebcastPushConnection } from 'tiktok-live-connector';
import fs from 'fs';

const username = (process.env.TIKTOK_PROBE_USER || '').replace(/^@/, '');
const outDir = process.env.TIKTOK_PROBE_OUT || '.';
if (!username) {
  console.error('TIKTOK_PROBE_USER is required');
  process.exit(2);
}

const conn = new WebcastPushConnection(username, {
  processInitialData: true,
  enableExtendedGiftInfo: true,
});

const seen = [];
const record = (type, payload) => {
  seen.push({ type, at: Date.now(), payload });
  console.log('REAL_EVENT', type, JSON.stringify(payload));
};

conn.on('chat', (d) => record('chat', { uniqueId: d.uniqueId, nickname: d.nickname, comment: d.comment }));
conn.on('gift', (d) => record('gift', { uniqueId: d.uniqueId, giftName: d.giftName, diamondCount: d.diamondCount, repeatCount: d.repeatCount }));
conn.on('like', (d) => record('like', { uniqueId: d.uniqueId, likeCount: d.likeCount, totalLikeCount: d.totalLikeCount }));
conn.on('follow', (d) => record('follow', { uniqueId: d.uniqueId, nickname: d.nickname }));
conn.on('share', (d) => record('share', { uniqueId: d.uniqueId, nickname: d.nickname }));
conn.on('member', (d) => record('member', { uniqueId: d.uniqueId, nickname: d.nickname, actionId: d.actionId }));
conn.on('roomUser', (d) => record('viewerCount', { viewerCount: d.viewerCount }));
conn.on('error', (err) => console.error('EVENT_ERROR', err?.message || String(err)));

try {
  const state = await conn.connect();
  console.log('CONNECTED', JSON.stringify({
    roomId: state?.roomId,
    viewerCount: state?.viewerCount,
  }));
  await new Promise((r) => setTimeout(r, Number(process.env.TIKTOK_PROBE_WAIT_MS || 20000)));
  fs.writeFileSync(`${outDir}/events.json`, JSON.stringify(seen, null, 2));
  conn.disconnect();
  if (seen.some((e) => ['chat', 'gift', 'like', 'follow', 'share', 'member'].includes(e.type))) {
    console.log(`PROBE_RESULT=READY_EVENTS_OBSERVED count=${seen.length}`);
    process.exit(0);
  }
  console.log('PROBE_RESULT=CONNECTED_NO_EVENTS');
  process.exit(3);
} catch (err) {
  const detail = {
    ok: false,
    error_message: String(err?.message || err),
    error_name: err?.name || null,
    info: err?.info || null,
  };
  console.error('CONNECT_FAILED');
  console.error(JSON.stringify(detail, null, 2));
  fs.writeFileSync(`${outDir}/connector-offline-detail.log`, JSON.stringify(detail, null, 2));
  console.error('PROBE_RESULT=NOT_READY');
  process.exit(1);
}
EOF

export TIKTOK_PROBE_USER="$USERNAME"
export TIKTOK_PROBE_OUT="$OUT_DIR"
# Short wait for CI/agent unless overridden
export TIKTOK_PROBE_WAIT_MS="${TIKTOK_PROBE_WAIT_MS:-8000}"

set +e
node "$PROBE_DIR/probe.mjs" 2>&1 | tee "$OUT_DIR/connector-probe.log"
code=${PIPESTATUS[0]}
set -e
exit "$code"
