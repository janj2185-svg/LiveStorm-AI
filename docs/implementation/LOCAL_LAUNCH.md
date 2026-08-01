# SYLORA — Local launch guide (friend testing)

Date: 2026-08-01  
Audience: owner + friends testing on one machine / LAN

## Honest status

SYLORA **can be launched locally** for friend testing of identity, wallet,
gift catalog/purchase/send, social APIs, marketplace/learning/business modules,
admin, Gift Studio authoring, and Flutter clients.

It is **not** a fully verified public production deployment. Missing owner
credentials, platform approvals, AAA gift assets, and signed store binaries are
documented in `OWNER_ACTION_CHECKLIST.md` and `PRODUCTION_STATUS.md`.

## What was verified in this release pass

| Flow | Result |
|---|---|
| PostgreSQL migrations (7 heads) | Applied |
| Redis rate-limit connectivity | Working |
| MinIO object storage | Working (native binary; Docker overlay fails in nested cloud VMs) |
| Demo bootstrap accounts + credits | Working |
| Login (`sender@example.com`) | Working |
| Wallet balance | Working |
| Gift catalog `demo-heart` | Working |
| Gift purchase + send → `delivered` ledger event | Working |
| Backend unit tests | **67 passed**, 1 skipped |
| Gift/live focused tests after AI prompt fix | **23 passed** |

Docker Compose full stack remains **blocked in this cloud agent VM** by overlayfs
mount errors. On a normal laptop/VPS with Docker Engine 24+, use Compose as in
`infrastructure/README.md`.

## Fast path (native demo — no Docker)

### Prerequisites

- Ubuntu/Debian-like host with Python 3.12, PostgreSQL 16, Redis 7
- `minio` + `mc` binaries on `PATH`
- `mailpit` on `PATH`
- Node 20+ for Gift Studio / gift-runtime
- Flutter 3.44+ for the client

### 1. Configure API secrets

```bash
cp services/api/.env.example services/api/.env
# Fill DATABASE_URL, REDIS_URL, JWT_SECRET (>=32 chars),
# DATA_ENCRYPTION_KEY (Fernet), IP_HASH_KEY, SMTP_*, and S3_* for MinIO.
```

Required MinIO values for local demo:

```env
S3_ENDPOINT_URL=http://127.0.0.1:9000
S3_BUCKET=sylora-local
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<minio-root-user>
S3_SECRET_ACCESS_KEY=<minio-root-password>
```

CORS must include the Flutter Web origin you actually use, for example:

```env
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:8080"]
ALLOWED_HOSTS=["localhost","127.0.0.1"]
WEB_BASE_URL=http://localhost:5173
```

### 2. Start dependencies + API

```bash
chmod +x scripts/local-demo.sh
./scripts/local-demo.sh
```

Or manually:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e 'services/api[test]'
cd services/api
alembic upgrade head
sylora-api bootstrap-demo
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

API docs: `http://127.0.0.1:8000/docs`  
Mailpit UI: `http://127.0.0.1:8025`

### 3. Demo accounts (development only)

Password for all: `SyloraDemo2026!`

| Email | Roles | Purpose |
|---|---|---|
| `admin@example.com` | admin, creator, moderator | Credits issuance, AI provider config, moderation |
| `creator@example.com` | creator | Gift monetization recipient |
| `sender@example.com` | user | Buy/send gifts |
| `viewer@example.com` | user | Viewer / social |

Bootstrap also publishes gift slug **`demo-heart`** (PNG sprite + Lottie
fallback). This is **not** an AAA CGI asset.

### 4. Flutter

```bash
cd apps/sylora
flutter pub get
flutter run -d chrome \
  --web-port=8080 \
  --dart-define=SYLORA_API_BASE_URL=http://127.0.0.1:8000
```

Notes:

- Flutter shows wallet/catalog/purchase/send/history. It does **not** render
  Three.js/Lottie gift VFX. Preview animations in Gift Studio.
- Gift realtime on Flutter Web now uses one-time `/v1/gifts/events/ticket`
  sockets. Messaging/live realtime still require native clients (Authorization
  header limitation in browsers).

### 5. Gift Studio (animation preview)

```bash
cd packages/gift-runtime && npm ci && npm run build
cd ../../apps/gift-studio && npm ci && npm run dev
```

Sign in with a creator/admin demo account. Open published `demo-heart` runtime
or author a new draft → upload → review → publish.

### 6. AI chat (optional, requires your key)

Without a provider, AI endpoints correctly return `503 ai_provider_unavailable`.

1. Login as `admin@example.com`
2. `POST /v1/admin/ai/providers` with an OpenAI-compatible base URL + API key
3. Publish a chat prompt template
4. Use `/v1/ai/...` chat endpoints or the Flutter assistant screens

There is **no microphone / speech-to-text** path yet. The assistant reads chat
text and synthesized prompts for gift/follow/subscription events; it does not
hear streamer audio.

## Docker Compose path (laptop / VPS)

```bash
cp infrastructure/.env.example infrastructure/.env
# Replace every REPLACE_WITH_GENERATED value (openssl / python helpers in README)

docker compose \
  --env-file infrastructure/.env \
  -f infrastructure/compose/compose.yml \
  up -d --build
```

Then point `services/api/.env` `DATABASE_URL` / `REDIS_URL` / `S3_*` at the
Compose services (or run bootstrap inside the API container).

Full ports table: `infrastructure/README.md`.

## Smoke checklist for friends

1. Login as sender → wallet balance > 0  
2. Open gift catalog → see `Demo Heart`  
3. Purchase → inventory quantity increases  
4. Send to creator UUID → status `delivered`  
5. Creator wallet earnings increase  
6. Gift Studio preview plays Lottie/PNG fallback  
7. (Optional) Configure AI provider → assistant replies in chosen locale  

## What will not work tomorrow without owner action

- Real OpenAI/Anthropic/Gemini replies (need API key via admin providers)
- YouTube/Twitch/Discord live adapters (OAuth apps + scopes)
- TikTok / Kick / Facebook / Instagram Live (official API approval missing)
- Telegram (no adapter present)
- Stripe/Adyen top-ups and payouts
- AAA CGI gift library
- Signed iOS/Android store builds
- Production Kubernetes cluster
