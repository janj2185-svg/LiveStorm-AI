#!/usr/bin/env bash
# SYLORA — Phase 1 product-loop verify (login → wallet → feed → messaging)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
PY=python3
[[ -x services/api/.venv/bin/python ]] && PY=services/api/.venv/bin/python
exec "$PY" scripts/verify_product_loop.py
