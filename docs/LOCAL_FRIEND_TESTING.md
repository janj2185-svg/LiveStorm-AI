# SYLORA local friend-testing guide

This guide is for launching SYLORA on a laptop tomorrow with friends. It is
honest about what is fully working versus what still needs credentials, paid
services, or platform approval.

## Quick verdict

| Area | Status for friend testing |
|---|---|
| API + PostgreSQL + Redis | Fully working locally |
| Auth / registration / roles / wallet credits | Fully working with demo accounts |
| Social feed / messaging APIs | Fully working (empty or seeded content) |
| Gift APIs + Gift Studio + runtime | Fully working as **empty-catalog tooling** |
| Marketplace / learning / business / admin APIs | Fully working as empty product surfaces |
| Flutter Android/iOS/Web/Desktop clients | Code + tests pass; needs Flutter 3.44.8 locally |
| AI chat that “hears” streamers | Code path exists; **needs AI provider keys** |
| YouTube / Twitch / Discord / OBS adapters | Capability-aware; **need your app credentials** |
| TikTok / Kick / Facebook / Instagram Live | **Not available** until official approved APIs |
| AAA animated gifts | Runtime ready; **no AAA assets bundled** |
| Stripe / App Store / Play Billing | **Not configured**; fails closed |
| Full Docker Compose stack | Documented; needs Docker on the host |

## 1. Backend without Docker (recommended for tomorrow)

```bash
# once
sudo apt install -y postgresql postgresql-client redis-server python3.12-venv
chmod +x scripts/local-dev-up.sh
./scripts/local-dev-up.sh
```

This script:

1. starts PostgreSQL + Redis if needed
2. creates the `sylora` database
3. applies Alembic migrations
4. seeds demo accounts
5. starts a local SMTP sink on `:1025`
6. serves the API on `http://127.0.0.1:8000`

OpenAPI: `http://127.0.0.1:8000/docs`

### Demo accounts (seeded)

| Email | Password | Roles | Credits |
|---|---|---|---|
| `admin@example.com` | `HorseBattery!2026` | admin, moderator, user | 500000 |
| `creator@example.com` | `StudioLaunch!2026` | creator, user | 250000 |
| `business@example.com` | `CrmWorkspace!2026` | business, user | 100000 |
| `demo@example.com` | `FriendWatch!2026` | user | 50000 |

Re-seed only:

```bash
./scripts/local-dev-up.sh --seed-only
# or
cd services/api && source .venv/bin/activate && python -m app.cli seed-demo
```

## 2. Backend with Docker Compose

Requires Docker Engine 24+ and ~12 GB RAM for the full stack.

```bash
cp infrastructure/.env.example infrastructure/.env
# Replace every REPLACE_WITH_GENERATED_* value.
docker compose \
  --env-file infrastructure/.env \
  -f infrastructure/compose/compose.yml \
  up --build
```

## 3. Flutter clients

Install Flutter **3.44.8** (Dart 3.12.2). Older Flutter SDKs fail `pub get`.

```bash
cd apps/sylora
flutter pub get
flutter run -d chrome --dart-define=SYLORA_API_BASE_URL=http://localhost:8000
# or
flutter run -d linux --dart-define=SYLORA_API_BASE_URL=http://localhost:8000
flutter run -d android --dart-define=SYLORA_API_BASE_URL=http://10.0.2.2:8000
```

Release/store builds need signing accounts documented in `apps/sylora/README.md`.

## 4. Gift Studio + design gallery

```bash
# Gift Studio (authoring UI)
cd packages/gift-runtime && npm ci && npm run build
cd ../../apps/gift-studio && npm ci && npm run dev   # http://localhost:4317

# Lumen design gallery
pnpm install
pnpm dev   # http://localhost:5173
```

Gift Studio can import real assets only when S3/MinIO is configured. Without
storage credentials, upload verification returns `object_storage_unavailable`.

## 5. Environment variables you must supply for “real” features

Copy `services/api/.env.example`. Required for local API:

- `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, `IP_HASH_KEY`
- `SMTP_HOST` / `SMTP_FROM_EMAIL` (Mailpit or the local sink is fine)

Optional, fail closed until set:

| Variable / secret | Enables |
|---|---|
| OpenAI-compatible AI provider admin config | Real AI chat/voice/moderation |
| `OAUTH_GOOGLE_*` | Google login |
| `YOUTUBE_CLIENT_ID/SECRET` | YouTube Live OAuth |
| `TWITCH_CLIENT_ID/SECRET` | Twitch EventSub/OAuth |
| `DISCORD_APPLICATION_ID` | Discord chat/events |
| `S3_*` / MinIO | Gift/media uploads |
| `MEDIAMTX_*` | First-party RTMP/WebRTC plane |
| Payment provider injection | Wallet top-ups / payouts |
| Apple/Google signing + store products | Mobile IAP |

Never paste production secrets into the repo.

## 6. What friends can test tomorrow without paid APIs

1. Register / login / logout / refresh with demo accounts
2. Admin users, analytics empty-state, feature flags
3. Wallet balances and history after seed issuance
4. Gift catalog empty state, inventory empty state, authoring screens
5. Marketplace catalog empty state and seller store setup APIs
6. Learning catalog empty state
7. Business workspace creation for the business account
8. Live platform capability status (shows what each adapter needs)
9. AI provider status honesty (`chat: false` until you configure a provider)
10. Flutter Web/Linux login against the local API

## 7. What still needs your approval or paid setup

See:

- `docs/implementation/EXTERNAL_CAPABILITIES.md`
- `docs/implementation/AAA_GIFT_PRODUCTION_PIPELINE.md`
- `docs/implementation/PRODUCTION_READINESS.md`

Critical owner gates:

- AI provider key + data-processing terms
- Stripe/Adyen (or store IAP) decision
- YouTube/Twitch/Discord developer apps
- Official TikTok/Kick/Meta Live availability confirmation
- AAA gift studio budget and rights clearance
- Production SMTP + domain DNS
- Apple/Google developer accounts and signing

## 8. Verification commands already run in this release branch

```bash
cd services/api && source .venv/bin/activate
python -m pytest -q                 # 67 passed, 1 skipped without integration flag
RUN_EXTERNAL_INTEGRATION_TESTS=1 \
  SYLORA_INTEGRATION_DATABASE_URL=postgresql+asyncpg://sylora:...@127.0.0.1:5432/sylora \
  SYLORA_INTEGRATION_REDIS_URL=redis://127.0.0.1:6379/15 \
  python -m pytest -q tests/test_postgres_redis_integration.py

cd packages/gift-runtime && npm test && npm run build
cd apps/gift-studio && npm test && npm run build
cd services/companion && python3 -m pytest -q
pnpm test && pnpm build
cd apps/sylora && flutter analyze && flutter test
```
