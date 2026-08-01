# Production release status — friend-testing cut

Assessment date: 2026-08-01  
Branch: `cursor/sylora-production-release-9523`  
Decision for public production launch: **NO-GO**  
Decision for local friend testing tomorrow: **GO with explicit limits**

## Verified in this run

| Check | Result |
|---|---|
| PostgreSQL 16 + Redis local stack | Ready; API `/health/live` and `/health/ready` = 200 |
| Alembic migrations to head | Applied (`20260731_0001` … `0007`) |
| Backend unit/integration tests | 67 passed; Postgres/Redis vertical test passed with `RUN_EXTERNAL_INTEGRATION_TESTS=1` |
| Gift runtime | 11/11 passed |
| Gift Studio | 13/13 passed after WebCrypto/jsdom fix |
| OBS companion | 22 passed |
| Lumen gallery | 4 tests + 90/90 contrast + production build |
| Flutter 3.44.8 | `flutter analyze` clean; 32/32 tests passed |
| Demo account seed | Login + roles + wallet balances verified against live API |
| AI provider honesty | `/v1/ai/providers/status` returns all capabilities `false` until configured |
| Gift catalog honesty | `/v1/gifts/catalog` returns empty items (no AAA assets bundled) |

Evidence artifacts:

- `/opt/cursor/artifacts/screenshots/` — design gallery + live API smoke
- `/opt/cursor/artifacts/sylora_gallery_walkthrough.mp4`
- `docs/evidence/`
- `docs/LOCAL_FRIEND_TESTING.md`

## Fully working for friend testing

- Identity: register/login/refresh/logout, RBAC, demo admin/creator/business/user accounts
- Immutable wallet ledger and seeded credits
- Gift authoring/catalog/inventory/send APIs as empty-catalog tooling
- Gift Studio + runtime packaging contracts
- Social/messaging/admin/marketplace/learning/business API surfaces
- Live adapter capability status (YouTube/Twitch/Discord/OBS/MediaMTX boundaries)
- Flutter client foundation for Android/iOS/Web/Windows/macOS/Linux (tests + analyze)
- Local launch without Docker via `scripts/local-dev-up.sh`

## Partially working / needs your keys

- AI assistant speech/hearing/memory: implemented, fails closed until AI provider + mic/stream wiring credentials
- YouTube / Twitch / Discord / OBS: adapters exist; need developer apps and OAuth secrets
- Object storage uploads: need MinIO/S3 credentials
- MediaMTX RTMP/WebRTC: needs Compose/media plane on a Docker host
- Payments/top-ups/payouts: provider must be injected; no bundled PSP
- Email delivery beyond local sink: real SMTP/SES

## Requires your approval

- AAA gift production pipeline and studio budget — see `docs/implementation/AAA_GIFT_PRODUCTION_PIPELINE.md`
- Payment provider choice (Stripe Connect / Adyen / store IAP)
- AI provider data-processing terms and model region claims
- Public production launch legal/compliance sign-off

## Requires paid services

- AI inference usage
- Production SMTP / domain email
- S3/CDN egress
- Optional Elasticsearch/Milvus/Kafka hosts if not using local Compose
- Apple Developer + Google Play accounts for store distribution
- Optional payment processor fees

## Requires official platform approval

- TikTok LIVE — no approved public third-party LIVE API claimed; do not scrape
- Kick / Facebook Live / Instagram Live — need current official scopes and app review
- YouTube Live channel eligibility + OAuth verification as required by Google
- Twitch EventSub / Discord app verification thresholds as applicable
- App Store / Play policy review for virtual gifts and subscriptions

## Fixes included in this branch

1. Gift Studio SHA-256 import under jsdom — force Node Web Crypto in tests; normalize digest input
2. Reject reserved `.local` SMTP from-address defaults that blocked API settings validation
3. Demo account seeder CLI (`python -m app.cli seed-demo`) for verified local accounts + credits
4. `scripts/local-dev-up.sh` Postgres/Redis/migrate/seed/API bootstrap without Docker
5. Friend-testing and AAA gift pipeline documentation

## What was intentionally not claimed

- Full Docker Compose live boot in this nested cloud VM (no Docker daemon here)
- AAA CGI gift library existence
- Successful TikTok/Kick/Meta Live connectivity
- Successful paid AI conversations without your API key
- Store-signed Flutter release binaries
