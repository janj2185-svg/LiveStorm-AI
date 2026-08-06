# SYLORA — Ecosystem completion wave (2026-08-06)

Branch: `cursor/sylora-ecosystem-complete-3bc5`  
Base: Ethereal APPROVE FINAL (`3997647`) + founder vision brief

## What this wave delivers

1. **Full desktop rail IA** matching the owner brief:
   Home · Live · Aura · Messages · Friends · Market · Learning · Business · Music · Studio · Gift Shop · Wallet · Analytics · Profile · Settings
2. **Phone island**: Home · Live · Create · Messages · Profile
3. **Analytics** first-class route (`/analytics`) with living creator metrics or onboarding CTA
4. **Studio / Business** always navigable (onboarding CTAs instead of hard nav deny)
5. **Glass edit-profile dialog** + `showSyloraNotice` (replaces Material AlertDialog on profile edit)
6. **Idempotent auth migrations** so fresh Postgres installs reach alembic head after `create_all` revisions

## Local verification (this agent)

| Check | Result |
|---|---|
| `alembic upgrade head` on clean DB | PASS |
| API `/health/ready` | PASS |
| Register → login → me / feed / gifts / AI / live | PASS |
| Flutter analyze (changed files) | PASS |
| `flutter test test/module_repository_test.dart` | PASS (7) |

## Honest boundaries (not claimed)

- Photoreal talking Aura avatar (needs owner-chosen provider — see quality gate)
- TikTok / Facebook / Instagram LIVE co-host (blocked until official provider access)
- Real Stripe payouts / FCM / production SMTP without owner secrets
- AAA Hollywood gift remasters (procedural / authored assets only)
- Public HTTPS cutover without owner VPS/domain/secrets

## Run locally

```bash
./setup-local.sh --host
# migrate + API
cd services/api && .venv/bin/alembic upgrade head
# with CORS/env loaded from services/api/.env
uvicorn app.main:app --host 127.0.0.1 --port 8000

cd apps/sylora
flutter run -d chrome --dart-define=SYLORA_API_BASE_URL=http://127.0.0.1:8000
```

Design SSOT remains Ethereal: `docs/design/v2-ethereal/`.
