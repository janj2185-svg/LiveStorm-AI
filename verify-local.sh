#!/usr/bin/env bash
# SYLORA — verify local stack for owner testing
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
FAIL=0

check() {
  local name="$1" cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "✔ $name"
  else
    echo "✖ $name"
    FAIL=1
  fi
}

echo "=== SYLORA verify-local ==="
echo "Path:   $ROOT"
echo "Branch: $(git branch --show-current 2>/dev/null || echo unknown)"
echo "Commit: $(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo ""

# Identity check
if grep -q "ACTIVE PROJECT IDENTITY — SYLORA" docs/implementation/ACTIVE_PROJECT_IDENTITY.md 2>/dev/null; then
  echo "✔ Project identity doc is SYLORA"
else
  echo "✖ Missing SYLORA identity doc"
  FAIL=1
fi
if [[ -d apps/sylora && -d services/api && -d packages/gift-runtime ]]; then
  echo "✔ SYLORA tree present (apps/sylora, services/api, packages/gift-runtime)"
else
  echo "✖ SYLORA tree incomplete"
  FAIL=1
fi

check "API /health/live" "curl -sf http://127.0.0.1:8000/health/live"
check "API /health/ready" "curl -sf http://127.0.0.1:8000/health/ready"
check "API /v1/diagnostics (dev)" "curl -sf http://127.0.0.1:8000/v1/diagnostics"
check "API OpenAPI docs" "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/docs | grep -q 200"
check "Design gallery" "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:5173/ | grep -q 200"
check "Gift Library hash route reachable" "curl -sf http://127.0.0.1:5173/ | grep -qi sylora"
check "Postgres accepting" "pg_isready -h 127.0.0.1 -p 5432"
check "Redis ping" "redis-cli ping | grep -q PONG"

# Gift library honesty
python3 - <<'PY'
import json
from pathlib import Path
cat = json.loads(Path("artifacts/gift-library/catalog.json").read_text())
ready = sum(1 for g in cat["gifts"] if g.get("status") == "READY")
built = sum(1 for g in cat["gifts"] if g.get("status") == "ASSETS_BUILT_NOT_READY")
spec = sum(1 for g in cat["gifts"] if g.get("status") == "SPEC_ONLY")
print(f"Gift library: READY={ready} ASSETS_BUILT_NOT_READY={built} SPEC_ONLY={spec}")
if ready > 0:
    print("✔ Catalog reports READY gifts")
else:
    print("ℹ No READY gifts (expected) — owner gallery uses ASSETS_BUILT_NOT_READY previews only")
PY

# Login smoke with owner account if API up
if curl -sf http://127.0.0.1:8000/health/live >/dev/null 2>&1; then
  CODE=$(curl -sf -o /tmp/sylora-login.json -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -d '{"email":"owner@sylora.dev","password":"OwnerTest!2026Local"}' \
    http://127.0.0.1:8000/v1/auth/login || true)
  if [[ "$CODE" == "200" ]] && grep -q access_token /tmp/sylora-login.json 2>/dev/null; then
    echo "✔ Owner login works"
  else
    echo "✖ Owner login failed (run seed: python3 scripts/seed_owner_accounts.py) HTTP=$CODE"
    FAIL=1
  fi
fi

# Product loops (wallet / feed / messaging) — Phase 1
if [[ -f scripts/verify_product_loop.py ]]; then
  echo ""
  echo "--- Product loop verify ---"
  PY=python3
  [[ -x services/api/.venv/bin/python ]] && PY=services/api/.venv/bin/python
  if $PY scripts/verify_product_loop.py; then
    echo "✔ Product loop verify"
  else
    echo "✖ Product loop verify failed"
    FAIL=1
  fi
fi

# Phase 3 fail-closed (no keys) — live ingest + AI provider honesty
if [[ -f scripts/verify_phase3_nokeys.py ]]; then
  echo ""
  echo "--- Phase 3 no-keys verify ---"
  PY=python3
  [[ -x services/api/.venv/bin/python ]] && PY=services/api/.venv/bin/python
  if $PY scripts/verify_phase3_nokeys.py; then
    echo "✔ Phase 3 no-keys verify"
  else
    echo "✖ Phase 3 no-keys verify failed"
    FAIL=1
  fi
fi

# AI provider wiring (when OPENAI_API_KEY present in gitignored env)
if [[ -f scripts/verify_ai_provider.py ]]; then
  echo ""
  echo "--- AI provider verify ---"
  PY=python3
  [[ -x services/api/.venv/bin/python ]] && PY=services/api/.venv/bin/python
  if $PY scripts/verify_ai_provider.py; then
    echo "✔ AI provider verify"
  else
    echo "✖ AI provider verify failed"
    FAIL=1
  fi
fi

# Live MediaMTX (when control URL configured)
if [[ -f scripts/verify_live_mediamtx.py ]] && grep -q '^MEDIAMTX_CONTROL_URL=http' services/api/.env 2>/dev/null; then
  echo ""
  echo "--- Live MediaMTX verify ---"
  PY=python3
  [[ -x services/api/.venv/bin/python ]] && PY=services/api/.venv/bin/python
  if $PY scripts/verify_live_mediamtx.py; then
    echo "✔ Live MediaMTX verify"
  else
    echo "✖ Live MediaMTX verify failed"
    FAIL=1
  fi
fi

# Flutter mobile integration readiness (no Flutter SDK required)
if [[ -f scripts/verify_flutter_integration.py ]]; then
  echo ""
  echo "--- Flutter integration verify ---"
  PY=python3
  [[ -x services/api/.venv/bin/python ]] && PY=services/api/.venv/bin/python
  if $PY scripts/verify_flutter_integration.py; then
    echo "✔ Flutter integration verify"
  else
    echo "✖ Flutter integration verify failed"
    FAIL=1
  fi
fi

# Gift readiness honesty (never claims READY)
if [[ -f scripts/gift-library/report_readiness_gaps.py ]]; then
  echo ""
  echo "--- Gift readiness gaps ---"
  python3 scripts/gift-library/report_readiness_gaps.py || FAIL=1
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "VERIFY OK — stack is usable for owner testing."
  exit 0
fi
echo "VERIFY FAILED — see ✖ items above."
exit 1
