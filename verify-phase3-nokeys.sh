#!/usr/bin/env bash
# SYLORA — Phase 3 fail-closed verify (no OpenAI / MediaMTX keys required)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
PY=python3
[[ -x services/api/.venv/bin/python ]] && PY=services/api/.venv/bin/python
exec "$PY" scripts/verify_phase3_nokeys.py
