#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
PY=python3
[[ -x services/api/.venv/bin/python ]] && PY=services/api/.venv/bin/python
exec "$PY" scripts/verify_ai_provider.py
