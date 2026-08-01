# Verification evidence — 2026-08-01

## Automated tests

| Suite | Result |
|---|---|
| Backend `pytest` | 67 passed, 1 skipped |
| Backend gifts + live focused | 23 passed |
| `@sylora/gift-runtime` vitest | 11 passed |
| Gift Studio vitest | 13 passed |
| Flutter `flutter test` | 32 passed |
| Flutter `flutter analyze` | No issues found |
| Flutter `flutter build web --release` | Succeeded |

## Manual API smoke (this environment)

- Login `sender@example.com` → JWT issued
- Wallet balance returned spendable credits
- Catalog listed published `demo-heart`
- Purchase + send completed with `status: delivered`

Artifacts: `bootstrap-demo.json`, `api-smoke.json`

## Environment notes

- Native PostgreSQL 16 + Redis 7 + MinIO + Mailpit used (Docker overlay mounts fail in this nested cloud VM).
- No owner AI/provider keys configured; AI correctly returns unavailable without keys.
- UI video demos require a graphical session on the owner's machine; use `LOCAL_LAUNCH.md`.
