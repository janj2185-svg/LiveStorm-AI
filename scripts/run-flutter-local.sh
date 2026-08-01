#!/usr/bin/env bash
# SYLORA — run Flutter client against local API (owner machine needs Flutter SDK)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVICE="${1:-chrome}"

detect_lan_ip() {
  if [[ -n "${SYLORA_LAN_IP:-}" ]]; then
    echo "$SYLORA_LAN_IP"
    return
  fi
  # Prefer a non-loopback IPv4 from hostname -I / ip
  if command -v hostname >/dev/null 2>&1; then
    for ip in $(hostname -I 2>/dev/null || true); do
      case "$ip" in
        127.*|0.*) continue ;;
        *.*.*.*) echo "$ip"; return ;;
      esac
    done
  fi
  if command -v ip >/dev/null 2>&1; then
    ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}'
  fi
}

# Map device target → API origin unless SYLORA_API_BASE_URL is already set.
if [[ -n "${SYLORA_API_BASE_URL:-}" ]]; then
  API_BASE="$SYLORA_API_BASE_URL"
else
  case "$DEVICE" in
    android|emulator)
      # Android emulator loopback alias for host machine
      API_BASE="http://10.0.2.2:8000"
      ;;
    ios|iphone|ipad)
      API_BASE="http://127.0.0.1:8000"
      ;;
    device|lan|physical)
      LAN="$(detect_lan_ip || true)"
      if [[ -z "$LAN" ]]; then
        echo "Could not detect LAN IP. Set SYLORA_LAN_IP or SYLORA_API_BASE_URL."
        echo "Example: SYLORA_LAN_IP=192.168.1.20 ./scripts/run-flutter-local.sh device"
        exit 1
      fi
      API_BASE="http://${LAN}:8000"
      ;;
    *)
      API_BASE="http://127.0.0.1:8000"
      ;;
  esac
fi

if ! command -v flutter >/dev/null 2>&1; then
  echo "Flutter SDK not found on PATH."
  echo "Install Flutter 3.44+ on your machine, then re-run:"
  echo "  ./scripts/run-flutter-local.sh [chrome|linux|macos|windows|android|ios|device]"
  echo "API mapping for this target would be: $API_BASE"
  echo "Start backend first: ./start-local.sh --host"
  exit 1
fi

if ! curl -sf "$API_BASE/health/live" >/dev/null 2>&1; then
  # Android emulator URL is not reachable from the host shell — probe host loopback instead
  if [[ "$API_BASE" == "http://10.0.2.2:8000" ]]; then
    if ! curl -sf "http://127.0.0.1:8000/health/live" >/dev/null 2>&1; then
      echo "API not reachable at http://127.0.0.1:8000 — start with: ./start-local.sh --host"
      exit 1
    fi
    echo "Note: host checks 127.0.0.1; emulator will use $API_BASE"
  else
    echo "API not reachable at $API_BASE — start with: ./start-local.sh --host"
    echo "For a physical device, ensure the phone and PC share LAN and ALLOWED_HOSTS includes the host."
    exit 1
  fi
fi

cd "$ROOT/apps/sylora"
echo "Running SYLORA Flutter → $API_BASE (device=$DEVICE)"
echo "Seeded login: owner@sylora.dev / OwnerTest!2026Local"
exec flutter run -d "$DEVICE" --dart-define="SYLORA_API_BASE_URL=$API_BASE"
