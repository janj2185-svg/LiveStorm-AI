# SYLORA

**Owner local testing:** see [`OWNER_TESTING_GUIDE.md`](OWNER_TESTING_GUIDE.md) — preferred `docker compose up --build` or `./start-local.sh --host`.

# SYLORA

SYLORA is a multi-platform creator ecosystem with a Flutter client, FastAPI
backend, social network, creator commerce, AI Brain, AI Live Hub, gift runtime,
OBS companion and production infrastructure.

The light-first Lumen design system remains available as an independent visual
specification and gallery under `src/` and `docs/design/`.

## Repository

```text
apps/sylora/             Flutter app: Android, iOS, Web, Windows, macOS, Linux
apps/gift-studio/        Browser gift authoring and Three.js preview
packages/gift-runtime/   Strict gift manifest and rendering runtime
services/api/            FastAPI, PostgreSQL, Redis and Celery application
services/companion/      Localhost-only OBS WebSocket 5.x companion
infrastructure/          Compose, Kubernetes, monitoring, backups and media plane
src/                     Lumen design system and 38-screen reference gallery
docs/                    Design, implementation and production documentation
```

## Implemented platform capabilities

- Registration, email verification, login, rotating JWT sessions, password
  reset, OAuth/OIDC, TOTP 2FA, profiles and RBAC.
- Social graph, private follow requests, friendships, blocks/mutes,
  communities/channels, posts, comments, reactions, bookmarks, reposts,
  notifications, moderation, direct messages and durable realtime replay.
- Immutable double-entry credit ledger, wallet, gift catalog/inventory,
  purchases, sends, refunds, versioned manifests, verified assets and
  author-review-publish separation.
- Provider-neutral AI conversations, citations, consent, encrypted memory,
  quotas, usage accounting, approved tools, translation/moderation boundaries
  and multimodal job orchestration.
- AI Live Hub with capability-verified YouTube, Twitch, Discord, OBS and
  MediaMTX adapters; normalized events, rules, moderation, personas, games,
  reconnects and replay.
- Creator accounts, content lifecycle, subscriptions and analytics.
- Marketplace stores, products, carts, orders, credit checkout, entitlements,
  downloads, service bookings, reviews and refunds.
- Courses, curriculum, enrollments, progress, quizzes and verifiable
  certificates.
- Multi-tenant workspaces, teams, CRM, tasks, calendar, documents, budgets,
  expenses, invoices, reports, feature flags and admin/security dashboards.
- RTMP, HLS, WHIP/WHEP WebRTC, SRT, TURN, recording upload, Prometheus and
  Grafana infrastructure.

## Run the backend

The local infrastructure requires explicit secrets; copy the example first.

```bash
cp infrastructure/.env.example infrastructure/.env
# Fill every value marked as required.
docker compose \
  --env-file infrastructure/.env \
  -f infrastructure/compose/compose.yml up --build
```

API documentation is exposed at `http://localhost:8000/docs`. Detailed backend
configuration and endpoints are in `services/api/README.md`.

## Run Admin (Next.js)

```bash
cd apps/admin
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:4317` and sign in with an owner/admin account
(e.g. `owner@sylora.dev` / `OwnerTest!2026Local` after seeding).

## Run Flutter

Flutter 3.44.7 is the supported SDK.

```bash
cd apps/sylora
flutter pub get
flutter run -d chrome \
  --dart-define=SYLORA_API_BASE_URL=http://localhost:8000
```

Production builds require an HTTPS API origin. Android release signing, Apple
signing/provisioning and platform secure-storage requirements are documented in
`apps/sylora/README.md`.

## Run Gift Studio

```bash
cd packages/gift-runtime
npm ci
npm run build

cd ../../apps/gift-studio
npm ci
npm run dev
```

Gift Studio keeps its bearer token in memory, uploads assets through real
presigned S3 grants and follows the draft → assets → strict manifest → review →
publish workflow. No gift assets are bundled.

## Run the OBS companion

```bash
cd services/companion
python3 -m pip install -e '.[dev]'
python3 -m sylora_companion run
```

The companion binds to loopback by default and controls OBS only through the
official WebSocket 5.x protocol. See `services/companion/README.md`.

## Design gallery

```bash
pnpm install
pnpm dev
```

`pnpm build` regenerates tokens, enforces all contrast assertions, typechecks
and builds the gallery. Edit authoritative TypeScript tokens under
`src/design-system/tokens/`; generated CSS and Figma exports must not be edited
directly.

## Verification

```bash
pnpm test
pnpm build
pnpm test:backend

cd apps/sylora && flutter analyze && flutter test
cd packages/gift-runtime && npm test && npm run build
cd apps/gift-studio && npm test && npm run build
cd services/companion && python3 -m pytest
```

CI additionally compiles Flutter Web/Linux/Android, iOS/macOS without signing
and Windows.

## External capability boundaries

The repository does not contain production credentials, licensed CGI assets,
payment processor configuration, email delivery credentials, cloud S3
credentials, Apple/Google signing keys or platform review approvals.

Unconfigured payment, storage, AI, transcoding, PDF, e-signature and external
platform capabilities fail explicitly; they never return simulated success.
TikTok, Kick, Facebook and Instagram Live remain unavailable until approved
official APIs and scopes are supplied. AAA gift content requires authored and
licensed Blender/Unity/Unreal assets plus real device QA; the runtime and editor
do not imply that such an asset library is bundled.
