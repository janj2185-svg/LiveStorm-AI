#!/usr/bin/env bash
# SYLORA — run Flutter client against local API (owner machine needs Flutter SDK)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE="${SYLORA_API_BASE_URL:-http://127.0.0.1:8000}"
DEVICE="${1:-chrome}"

if ! command -v flutter >/dev/null 2>&1; then
  echo "Flutter SDK not found on PATH."
  echo "Install Flutter 3.44+ on your machine, then re-run:"
  echo "  ./scripts/run-flutter-local.sh [chrome|linux|macos|windows|android]"
  echo "API is expected at: $API_BASE"
  echo "Start backend first: ./start-local.sh --host"
  exit 1
fi

if ! curl -sf "$API_BASE/health/live" >/dev/null 2>&1; then
  echo "API not reachable at $API_BASE — start with: ./start-local.sh --host"
  exit 1
fi

cd "$ROOT/apps/sylora"
echo "Running SYLORA Flutter → $API_BASE (device=$DEVICE)"
exec flutter run -d "$DEVICE" --dart-define="SYLORA_API_BASE_URL=$API_BASE"
