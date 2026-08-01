#!/usr/bin/env bash
# Start local MediaMTX for SYLORA host-mode live ingest (no Docker).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/.sylora-local/bin/mediamtx"
CFG="$ROOT/.sylora-local/mediamtx.yml"
ENVF="$ROOT/.sylora-local/mediamtx.env"
LOG="$ROOT/.sylora-local/logs/mediamtx.log"
PIDF="$ROOT/.sylora-local/mediamtx.pid"
REC="$ROOT/.sylora-local/mediamtx-recordings"

mkdir -p "$ROOT/.sylora-local/logs" "$REC" "$ROOT/.sylora-local/bin"

if [[ ! -x "$BIN" ]]; then
  echo "Downloading MediaMTX v1.19.3..."
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/mediamtx.tgz" \
    https://github.com/bluenviron/mediamtx/releases/download/v1.19.3/mediamtx_v1.19.3_linux_amd64.tar.gz
  tar -xzf "$tmp/mediamtx.tgz" -C "$tmp"
  found="$(find "$tmp" -type f -name mediamtx | head -1)"
  cp "$found" "$BIN"
  chmod +x "$BIN"
  rm -rf "$tmp"
fi

if [[ ! -f "$CFG" ]]; then
  python3 - <<PY
from pathlib import Path
src = Path("$ROOT/infrastructure/streaming/mediamtx.yml").read_text()
src = src.replace(
    "recordPath: /recordings/%path/%Y-%m-%d_%H-%M-%S-%f",
    "recordPath: $REC/%path/%Y-%m-%d_%H-%M-%S-%f",
)
Path("$CFG").write_text(src)
print("wrote $CFG")
PY
fi

if [[ ! -f "$ENVF" ]]; then
  python3 - <<'PY'
import secrets
from pathlib import Path
root = Path("/workspace")
path = root / ".sylora-local" / "mediamtx.env"
api_user, api_pass = "sylora_mtx", secrets.token_urlsafe(24)
pub_user, pub_pass = "sylora_pub", secrets.token_urlsafe(24)
read_user, read_pass = "sylora_read", secrets.token_urlsafe(24)
path.write_text(
    "\n".join(
        [
            f"MTX_AUTHINTERNALUSERS_0_USER={pub_user}",
            f"MTX_AUTHINTERNALUSERS_0_PASS={pub_pass}",
            f"MTX_AUTHINTERNALUSERS_1_USER={read_user}",
            f"MTX_AUTHINTERNALUSERS_1_PASS={read_pass}",
            f"MTX_AUTHINTERNALUSERS_2_USER={api_user}",
            f"MTX_AUTHINTERNALUSERS_2_PASS={api_pass}",
            "",
        ]
    )
)
# Wire API env (gitignored)
mapping = {
    "MEDIAMTX_CONTROL_URL": "http://127.0.0.1:9997",
    "MEDIAMTX_CONTROL_USERNAME": api_user,
    "MEDIAMTX_CONTROL_PASSWORD": api_pass,
}
for env_path in (root / "services" / "api" / ".env", root / ".env.local"):
    if not env_path.exists():
        continue
    lines = []
    seen = set()
    for line in env_path.read_text().splitlines():
        stripped = line.strip()
        raw = stripped.lstrip("#").strip()
        key = raw.split("=", 1)[0] if "=" in raw else None
        if key in mapping:
            lines.append(f"{key}={mapping[key]}")
            seen.add(key)
        else:
            lines.append(line)
    for key, value in mapping.items():
        if key not in seen:
            lines.append(f"{key}={value}")
    env_path.write_text("\n".join(lines) + "\n")
print("generated mediamtx credentials into .sylora-local/mediamtx.env + API .env")
PY
fi

if [[ -f "$PIDF" ]] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then
  echo "MediaMTX already running pid=$(cat "$PIDF")"
  exit 0
fi

# Sync control credentials from mediamtx.env into API .env every start
python3 - <<'PY'
from pathlib import Path
root = Path("/workspace")
mtx = {}
for line in (root / ".sylora-local" / "mediamtx.env").read_text().splitlines():
    if "=" in line:
        k, _, v = line.partition("=")
        mtx[k] = v
mapping = {
    "MEDIAMTX_CONTROL_URL": "http://127.0.0.1:9997",
    "MEDIAMTX_CONTROL_USERNAME": mtx["MTX_AUTHINTERNALUSERS_2_USER"],
    "MEDIAMTX_CONTROL_PASSWORD": mtx["MTX_AUTHINTERNALUSERS_2_PASS"],
}
for env_path in (root / "services" / "api" / ".env", root / ".env.local"):
    if not env_path.exists():
        continue
    lines = []
    seen = set()
    for line in env_path.read_text().splitlines():
        stripped = line.strip()
        raw = stripped.lstrip("#").strip()
        key = raw.split("=", 1)[0] if "=" in raw else None
        if key in mapping:
            lines.append(f"{key}={mapping[key]}")
            seen.add(key)
        else:
            lines.append(line)
    for key, value in mapping.items():
        if key not in seen:
            lines.append(f"{key}={value}")
    env_path.write_text("\n".join(lines) + "\n")
PY

set -a
# shellcheck disable=SC1090
source "$ENVF"
set +a
nohup "$BIN" "$CFG" >"$LOG" 2>&1 &
echo $! >"$PIDF"
sleep 1
if ! kill -0 "$(cat "$PIDF")" 2>/dev/null; then
  echo "MediaMTX failed to start — see $LOG"
  tail -n 40 "$LOG" || true
  exit 1
fi
echo "MediaMTX started pid=$(cat "$PIDF")"
echo "  Control API: http://127.0.0.1:9997"
echo "  RTMP:        rtmp://127.0.0.1:1935"
echo "  HLS:         http://127.0.0.1:8888"
echo "  WebRTC:      http://127.0.0.1:8889"
echo "Restart SYLORA API after first credential generation so it picks up MEDIAMTX_*."
