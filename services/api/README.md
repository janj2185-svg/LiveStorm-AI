# SYLORA API

FastAPI modular-monolith foundation for SYLORA identity, account security, RBAC,
profiles, first-party social networking, persisted messaging, an immutable
wallet ledger, versioned gift authoring, catalog, inventory, and delivery, and
the consent-gated provider-neutral SYLORA AI Brain and AI Live Hub.
PostgreSQL and Redis are required at runtime.
SQLite is accepted only when `ENVIRONMENT=test`.

## Local setup

Run these commands from the repository root:

```bash
cd services/api
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[test]"
cp .env.example .env
```

Generate independent values for the three secret settings and place only their
outputs in `.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use the outputs for `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, and `IP_HASH_KEY`,
respectively. Configure `DATABASE_URL` for PostgreSQL, `REDIS_URL` for Redis,
and the `SMTP_*` values for a real SMTP receiver. Mailpit is valid for local
development when it is running and the configured host/port reach it. The API
does not emulate email delivery.

Create an empty PostgreSQL database, then apply the schema:

```bash
cd services/api
source .venv/bin/activate
alembic upgrade head
```

Start the API:

```bash
cd services/api
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Start an outbox drain from a worker process or scheduler:

```bash
cd services/api
source .venv/bin/activate
python -m app.cli drain-outbox --limit 50
```

The command sends due messages using SMTP and records retry attempts with
exponential backoff. `app.email.celery_drain_outbox` is an async callable that
can be wrapped by a Celery task without changing email behavior.

## Tests and compilation

Tests create isolated SQLite databases and an in-process Redis behavior double.
AI contract tests inject a deterministic `TestProvider` only through
`create_app` or service boundaries. Product runtime configuration remains
unconfigured; no test provider is available to product code.

```bash
cd services/api
source .venv/bin/activate
python -m pytest
python -m compileall app
```

To validate the migration against a disposable database, point `.env` at that
database and run:

```bash
alembic upgrade head
alembic downgrade base
alembic upgrade head
```

## Production configuration

`ENVIRONMENT=production` rejects startup unless:

- `DATABASE_URL` is PostgreSQL and `REDIS_URL` is Redis.
- `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, and `IP_HASH_KEY` are explicitly set.
- JWT issuer/audience values identify the deployment.
- SMTP host/from values are configured.
- CORS origins and trusted hosts are explicit and do not contain wildcards.
- `WEB_BASE_URL` is HTTPS and is not localhost.

Startup verifies PostgreSQL and Redis, then idempotently seeds the built-in
`user`, `creator`, `business`, `moderator`, and `admin` roles and their minimal
permission matrix, plus the system ledger accounts. Existing installations gain
new permissions and role assignments idempotently. If either dependency is
unavailable, startup fails.
`/health/live` reports process liveness, `/health/ready` checks both
dependencies, and `/metrics` exposes Prometheus request counts and latency.

OAuth providers are configured by name:

```dotenv
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
OAUTH_GOOGLE_DISCOVERY_URL=https://accounts.google.com/.well-known/openid-configuration
OAUTH_GOOGLE_REDIRECT_URI=https://api.sylora.example/v1/auth/oauth/google/callback
OAUTH_GOOGLE_SCOPES=openid email profile
```

The provider must expose valid OIDC discovery metadata. The callback validates
state, PKCE, nonce, signature, issuer, audience, expiry, subject, and verified
email before linking or creating an identity. An unconfigured provider returns
an explicit `oauth_provider_unavailable` response; it never reports simulated
success.

## Wallet, ledger, and payments

`SYLORA_CREDIT` amounts are persisted only as integer minor units. The ledger
uses immutable transactions and entries with equal debit and credit totals.
Wallet and creator accounts cannot become negative; system issuance, revenue,
processor-clearing, gift-liability, payout-liability, and refund-liability
accounts have explicit normal sides and negative-balance policy. Account rows
are locked in UUID order before posting. Wallet balance and signed-cursor
history are computed from entries, which remain the source of truth.

PostgreSQL migration `20260731_0003_wallet_gifts` installs database triggers
that reject entry updates/deletes and posted transaction updates/deletes. Its
deferred constraint triggers reject transactions with fewer than two entries
or unequal debit and credit totals. Reversals and refunds append new entries;
they do not rewrite the original financial record.

The principal APIs are:

- `GET /v1/wallet/balance`, `GET /v1/wallet/creator-earnings`, and
  `GET /v1/wallet/transactions`
- `POST /v1/admin/ledger/issuance` and the RBAC-protected reversal API
- `POST /v1/wallet/topups`, `POST /v1/wallet/payouts`, and
  `POST /v1/payments/webhooks/{provider}`

Mutating financial APIs require `Idempotency-Key`. Purchase, send, and top-up
requests are Redis rate limited. There is no bundled fake or default payment
processor. `PaymentProvider` is a provider-neutral integration and signature
verification boundary; deployments must inject a real implementation. Without
one, top-up, payout, refund-provider, and webhook operations return
`503 payment_provider_unavailable` before reporting or persisting success. A
webhook implementation must verify the signature over the untouched raw body
before returning a normalized event.

## Gift authoring, catalog, and delivery

Gift authoring APIs under `/v1/gifts/author` create categories, definitions,
immutable versions, collections, and S3-backed asset declarations. The
bootstrap order is definition → empty draft version → verified assets → strict
manifest patch → review; this lets manifests reference the server-issued asset
IDs without a circular dependency. Authoring list/get endpoints expose only
resources allowed by author or publisher RBAC. Draft manifests are strict
runtime contracts for Three.js, Flutter, Lottie, Unity, and Unreal renderer
targets; Blender is represented as source metadata.
Contracts cover typed layers, timelines, particles, shaders, lighting, spatial
audio, interaction hooks, combinations, deterministic/client-AI parameters,
and full-screen/viewer/avatar/streamer effect scopes.

Publication is separate from authoring. `gifts:review` can run publication
validation and `gifts:publish` can publish or retire a version. Ultra-premium
content cannot be approved by its own author. Publication requires every
manifest-referenced object to have a verified S3 size, content type, and
SHA-256; low-end, reduced-motion, and no-audio fallbacks; and passing download,
duration, particle, shader, and audio-loudness budgets. Published content and
its assets are immutable, except for the explicit lifecycle-only retirement
transition. `gifts:moderate` exposes an audited emergency retirement switch
that stops new deliveries while preserving history.

Configure real S3-compatible storage with `S3_ENDPOINT_URL`, `S3_BUCKET`,
`S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`. Upload and download
URLs are short-lived signed operations; only server-generated object keys are
persisted. Completion performs `HEAD` verification before marking an asset
verified. If storage is not configured, upload completion/download capability
returns `503 object_storage_unavailable`; no local or simulated object success
exists.

Catalog, collection, recommendation, inventory, purchase, send, retry, history,
preference, and event APIs are under `/v1/gifts`. Catalog queries expose only
published, currently available, eligible definitions. Purchases move wallet
value into gift liability and grant inventory atomically. Sends consume that
backing, or buy and send directly, then split integer value between recipient
creator earnings and platform revenue. Blocks, gift privacy, eligibility,
supply/user caps, expiry, creator monetization, and daily spend limits are
enforced server-side. Refunds are audited and idempotent; delivered-gift
creator shortfalls are recorded against the refund-liability account.

`GET /v1/gifts/recommendations` is explicitly a persisted category-affinity
heuristic. Its response explains the purchase/view counts used in each score;
it is not an AI model. Combination events use compatible manifest IDs and a
bounded arrival window and never alter the ledger.

`GET /v1/gifts/catalog/{slug}/runtime` returns the strict published manifest and
verified asset metadata; signed binaries remain behind the entitlement-aware
asset download endpoint. `GET /v1/gifts/events` provides durable signed-cursor
replay. `/v1/ws/gifts` authenticates through a bearer header for native clients
or a 60-second, single-use Redis ticket issued by
`POST /v1/gifts/events/ticket` for browsers. It replays committed events from
`since` and emits only gift/version/asset references, never binary data. The
bounded live hub is process-local. Multi-replica deployments still require
Redis Streams, Kafka, or equivalent committed-event fan-out and consumer
recovery; this repository does not implement that cross-replica transport.

The authoring/runtime manifest, S3 asset verification, ledger, inventory, and
delivery infrastructure are implemented. Production AAA CGI still requires
authored or licensed Blender/Unreal/Unity content, renderer clients, and device
validation. Those assets, clients, engines, and validation programs are not
present in this backend repository, and this API does not claim that they are.

## SYLORA AI Brain

Migration `20260731_0004_ai_brain` adds provider configurations, per-user
consent/privacy/budget settings, conversations and messages, source citations,
tool definitions/proposals/immutable execution records, encrypted memory,
append-only usage, generation jobs, durable user events, immutable published
prompt versions, and export requests. PostgreSQL triggers reject updates and
deletes of usage and tool execution rows and reject mutation of published
prompt versions.

No provider credentials are bundled. Product runtime starts with an empty
provider registry and returns `503 ai_provider_unavailable` before persisting a
successful message, translation, moderation result, or generation job when no
real enabled provider supports the requested capability. Tests may inject a
deterministic `TestProvider` into `create_app`; this is not a product runtime
adapter.

Administrators with `ai:providers:manage` configure providers at
`/v1/admin/ai/providers`. Credentials are accepted only on create/rotation,
encrypted with `DATA_ENCRYPTION_KEY`, never returned, and never logged.
Configuration requires an explicit capability list, a model for every
capability, and optional integer-micro pricing entries:

```json
{
  "name": "openai-compatible",
  "base_url": "https://provider.example/v1",
  "api_credential": "write-only-secret",
  "enabled": true,
  "capabilities": ["chat", "embeddings", "image", "voice", "moderation"],
  "model_mapping": {
    "chat": "deployed-chat-model",
    "embeddings": "deployed-embedding-model",
    "image": "deployed-image-model",
    "voice": "deployed-tts-model",
    "moderation": "deployed-moderation-model"
  },
  "pricing_config": {
    "deployed-chat-model": {
      "prompt_micros_per_million": 0,
      "completion_micros_per_million": 0,
      "unit_micros": 0
    }
  }
}
```

The bundled real OpenAI-compatible HTTP adapter supports only explicitly
configured `chat`, `embeddings`, `image`, `voice` (TTS), and `moderation`.
It enforces HTTPS in production, bounded responses, timeouts, and retry with
jitter for rate-limit and transient server failures. It does not infer
capabilities from a provider name. Translation requires a separately injected
real adapter implementing the translation contract. Video, music, and avatar
have provider-neutral asynchronous adapter contracts, but no implementation is
bundled. Video, music, and avatar therefore remain unavailable until a real
configured adapter exists. This repository does not claim live provider or
model verification.

Generated binary output is transient and must be written to configured S3.
Only server-generated object keys, verified size/content type/SHA-256, and
bounded safe metadata are stored in `AIJob.output_refs`; provider URLs and
binary bodies are never persisted. Celery task
`sylora.ai.process_generation_job` loads enabled encrypted provider
configurations, invokes the real adapter, writes output to S3, and appends
durable lifecycle events.

Authenticated user APIs are:

- `GET /v1/ai/providers/status` and `GET/PATCH /v1/ai/settings`
- `/v1/ai/conversations` create/list/get/update/delete, signed-cursor message
  history, non-stream send, and SSE send at `/{id}/stream`
- `/v1/ai/conversations/{id}/proposals` list/approve/reject/execute
- `/v1/ai/memory` list/create/edit/delete/delete-all/export
- `POST /v1/ai/translate` and `POST /v1/ai/moderate`
- `/v1/ai/jobs` create/list/status/cancel/retry
- `/v1/ai/usage` history and `/v1/ai/usage/summary`
- SSE `GET /v1/ai/events` with signed durable replay cursors and optional live
  follow

Admin prompt publication is under `/v1/admin/ai/prompts` and requires
`ai:prompts:manage`; cross-user usage access requires `ai:usage:read:any`.
RBAC seeding is idempotent and grants these permissions only through the
built-in admin role by default.

Every AI invocation requires explicit consent, an enabled per-capability flag,
Redis rate-limit approval, and remaining user token/spend quota. Production
rate limiting fails closed. Context contains only that user's authorized
conversation, optional encrypted memory, own social/creator aggregates, and
own ledger accounts. Citations are accepted only when they match a source
resolved by the server. Provider text cannot invoke tools: only separate
strict-schema proposals for registered tools are accepted, and unknown tools
or fields reject the provider response.

Copilot leaves proposals for approval. Autopilot may execute only a low-risk
definition that allows autopilot and appears in the user's explicit allowlist.
Medium, high, and critical risk always require explicit human approval;
critical is never auto-approved. Manual conversations never execute tools.
Built-in transactional tools update bounded own-profile/account-setting
fields, create draft-only posts, mark an owned notification read, and create an
export request. They cannot publish a post. Tool decisions and terminal
effects are audited without logging prompts or provider responses.

AI memory requires both AI consent and memory enablement. Text is encrypted;
users can list, edit, export, delete individual items, disable memory (which
deletes all items), or delete all explicitly. Account deletion removes AI
content and jobs while retaining only append-only usage/tool audit linked to
the already-pseudonymized deleted account and a precomputed pseudonymous
subject hash.

Chat provider tokens may be transient during collection, but the final
assistant message, citations, proposals, usage, and durable completion event
commit before the API emits the SSE completion event. Provider raw payloads
are never stored. Moderation results are explicitly non-binding
recommendations; human moderation actions remain separate.

The optional live AI event hub is bounded and process-local. `AIEvent` rows and
signed cursors provide replay, but multi-replica live fan-out still requires
Redis Streams, Kafka, or equivalent committed-event transport and consumer
recovery.

## SYLORA AI Live Hub

Migration `20260731_0005_ai_live_hub` adds the official-integration and
live-control schema. Connections contain encrypted access, refresh, webhook,
and OBS credentials; explicit scopes; external account/channel identifiers;
health state; and verified capabilities. API responses expose only
credential-configured booleans. Capability snapshots record what an adapter
fetched and verified at a point in time. A platform name never enables a
capability.

Live sessions persist their state machine, owner/workspace, title/language,
moderation and AI modes, recording preference, random ingest path, and only a
SHA-256 stream-key hash. The raw key is returned once on session creation or
rotation. `GET /v1/live/sessions/{id}/stream-key` deliberately returns
`410 live_stream_key_not_recoverable`. Destinations persist independently
verified publish/chat/event/moderation/analytics switches, external broadcast
IDs, bounded exponential reconnect state, and terminal manual-intervention
errors.

The durable event and action model includes:

- ordered `LiveNormalizedEvent` rows with per-session sequence numbers and
  per-connection provider-event deduplication;
- `AILivePersona`, strict-schema `AILiveRule`, consent-gated `AILiveTurn`, and
  existing AI Brain conversation/message/job references;
- non-binding `LiveModerationDecision` recommendations, consent/retention
  records for platform-local viewer memory, and no cross-platform identity
  merge without a verified link;
- idempotent `LiveAction` commands and append-only state transitions, with only
  a hash of the official API response reference;
- durable `LiveEvent` replay/outbox rows and verified webhook deliveries; and
- deterministic quiz/game sessions, questions, one answer per platform
  participant, and persisted scores.

PostgreSQL triggers reject update/delete of normalized events, moderation
decisions, action transitions, and replay events. Live action commands cannot
be deleted and their target, type, idempotency key, and typed payload cannot be
changed; state changes append a transition row. Account deletion revokes and
scrubs credentials, external IDs, stream keys, personas, rules, and viewer
memory while retaining pseudonymized operational event/action audit.

### Official adapter matrix

| Platform | Implemented official mechanism | Capability and exact limitation |
| --- | --- | --- |
| YouTube | Data API v3 and Live Streaming API over bounded `httpx`; OAuth 2.0 authorization code + PKCE; `liveChatMessages.list/insert`; `liveBroadcasts` create/transition | Chat, events/analytics metadata, and broadcast-control capabilities are granted only after token/channel/scope verification. This API does not push media to YouTube and does not claim a `publish` capability. Quota and permission errors remain explicit. |
| Twitch | Helix over bounded `httpx`; signed EventSub webhook; official EventSub WebSocket over `websockets` | Chat read/send, EventSub events, analytics, message deletion, and timeout are scope-gated. Twitch has no Helix “create broadcast” operation; video starts through Twitch ingest outside this API, so no video-publish capability is claimed. |
| Discord | Bot REST, Gateway v10, and Ed25519-verified Interactions | Channel visibility and effective guild role/channel overwrites are resolved before chat/moderation capabilities are granted. Discord is chat/events only and is never represented as a video destination. Automatic ban is forbidden. |
| OBS Studio | obs-websocket 5.x over `websockets`, including official challenge authentication | Scene switching, source visibility, stream status/start/stop, and record status/start/stop. The endpoint must match the deployment allowlist; plaintext `ws://` is accepted only for an allowlisted loopback/private local companion. |
| MediaMTX | Deployment-configured Control API v3 over bounded `httpx` | First-party RTMP/WebRTC path provisioning, health, random key rotation, and path removal. The control URL is deployment settings only and must be HTTPS in production. FastAPI does not transcode, relay, package, or render media. |
| Plugin SDK | Ed25519-signed schema `1.0` manifest, allowlisted HTTPS callback/webhook hosts, secret/OAuth references, HMAC webhook, and idempotent HTTPS action callbacks | Only signed declared capabilities are considered, followed by callback health verification. No plugin code loads or executes in the API process. |
| TikTok, Kick, Facebook, Instagram | Capability descriptor only | Status is `requires_provider_review`. No scraping, reverse-engineered WebSocket, browser automation, unofficial endpoint, synthetic event, or simulated success exists. A deployment must inject a real approved official adapter with explicit endpoints, scopes, and capability grants. |

No external integration in this repository was live-verified without real
credentials, the applicable platform approval, and the deployment's
Docker/media plane. Adapter presence is not evidence that a customer account,
scope, quota, channel permission, OBS companion, MediaMTX instance, or plugin
endpoint is available. Unconfigured dependencies return explicit
unavailable/degraded status.

### Live API and processing

Creators receive `live:manage` and `live:integrations:manage` for owned
resources. Moderators receive `live:moderate`; admins receive all live
permissions, including `live:admin`. Principal APIs are:

- `/v1/live/integrations` for connection list/detail, connect, official OAuth
  start/callback, health/capability snapshots, and credential-scrubbing
  disconnect;
- `/v1/live/sessions` for create/configuration, destinations, preflight,
  start/reconnect/end, status, and one-time stream-key rotation;
- `/v1/live/personas` and `/v1/live/rules` CRUD, including explicit active and
  enabled switches;
- signed-cursor session event, action, moderation, and AI-turn history, plus
  action approval/execution;
- `/v1/live/games` create/start/answer/score/end with server-side deterministic
  scoring;
- `/v1/live/webhooks/{platform}/{connection_id}`, which verifies the untouched
  body before deduplicating and durably queueing normalization; and
- `/v1/admin/live/platforms` and `/v1/admin/live/integrations`, which never
  expose secrets.

Preflight rechecks the deployment MediaMTX path and every enabled destination
capability and health endpoint. Start is rejected unless all required checks
pass. Permission revocations are terminal and are not retried forever.
Transient connection/action failures use bounded exponential backoff with
jitter and a maximum retry count. Celery beat schedules token refresh,
connection health, and destination reconnect tasks; verified webhook delivery
processing is a separate durable Celery task.

Rule conditions use a bounded typed tree (`all`, `any`, `not`, and allowlisted
comparisons) with no `eval`, arbitrary expressions, or executable code. Rules
respect cooldown, rate, and event/rule idempotency. Medium/high/critical,
moderation, OBS scene, and custom-tool rules require human approval. Autopilot
can bypass approval only for an explicitly enabled low-risk rule. Moderation
providers produce recommendations. A narrowly configured policy may queue
only a high-confidence message deletion or timeout; it never automatically
bans.

Live AI responses use the existing consent, quota, provider, citation,
conversation, tool, generation-job, and S3 boundaries. A persona references a
published prompt key/version rather than storing a raw prompt. Language is
taken from verified platform metadata or an explicitly configured provider;
the service never invents detection or translation. Voice creates a real
existing AI Brain voice job; text fallback occurs only when the rule explicitly
allows it and a chat destination exists. With missing consent/provider/S3/voice
capability the turn records an explicit unavailable code.

First-party `GiftEvent` delivery can normalize to a `custom` live event for
overlay/rule handling. It never becomes an external donation and never mints
credits. External platform donation/gift amounts remain external normalized
events and do not enter the SYLORA ledger.

`/v1/ws/live/{session_id}` authenticates only by bearer header, authorizes only
the requested owned/admin session, replays committed `LiveEvent` rows from a
signed cursor, sends heartbeats, and uses a bounded queue. Its fan-out is
process-local. Multi-replica deployments still require Redis Streams, Kafka,
or equivalent committed-event fan-out and recovery; arbitrary socket
subscriptions are not accepted.

## Creator platform, marketplace, and education

Migration `20260731_0006_creator_commerce_learning` adds creator accounts,
subscription tiers and entitlement windows, versioned creator content and S3
asset declarations, stores and versioned products, persisted carts and orders,
digital entitlements and service bookings, buyer reviews, versioned courses,
ordered modules and lessons, server-authoritative progress, quizzes, attempts,
and verifiable certificates.

Creators receive `creator:manage`, `creator:analytics`, `marketplace:sell`, and
`courses:author`. Moderators receive `courses:review`; administrators receive
all creator, commerce, refund, course review, and course publication
permissions. Ownership remains mandatory in addition to RBAC. Published
content, product, and course versions are immutable; a new draft version is
required for changes. Content schedules dispatch the persisted content ID and
due time to the real `sylora.content.publish_scheduled` Celery task.

Principal APIs are:

- `/v1/creator/account`, `/v1/creator/channels/{slug}`,
  `/v1/creator/subscription-tiers`, `/v1/creator/dashboard`, and
  `/v1/creator/analytics`;
- `/v1/subscriptions` for credit or configured external purchases, gifts,
  entitlement windows, cancellation, and refunds;
- `/v1/content` for owned content/version lifecycle, scheduling,
  publication/unlisting, strict visibility checks, S3 upload declarations and
  verification, and explicit processing jobs;
- `/v1/marketplace/catalog`, `/v1/marketplace/cart`,
  `/v1/marketplace/checkout`, `/v1/marketplace/orders`,
  `/v1/marketplace/entitlements`, `/v1/marketplace/downloads`, and
  `/v1/marketplace/reviews`, with store, product, price, inventory, collection,
  sales, refund, and booking routes under `/v1/marketplace/seller` and
  `/v1/marketplace/orders/bookings`;
- `/v1/learning/courses`, `/v1/learning/enrollments`,
  `/v1/learning/quizzes`, and `/v1/learning/certificates` for catalog,
  curriculum, free/credit/configured-external enrollment, ordered
  prerequisites, bounded heartbeat progress, deterministic server-side quiz
  scoring, completion, issuance, and public verification.

Credit subscription, marketplace, refund, and course operations post balanced
entries to the existing immutable ledger. Marketplace carts retain integer
price snapshots. Credit checkout atomically creates the order and seller/platform
ledger split, decrements inventory, and creates either a digital entitlement or
a service booking request. A service purchase is not represented as delivered:
the seller must explicitly accept, schedule, and complete its booking. External
checkout remains `pending_payment` until a signature-verified, deduplicated
provider webhook advances it; a client return URL never marks an order paid.
Refunds append a ledger reversal and revoke active digital access rather than
editing financial history.

Catalog and course search use portable SQL `ILIKE` with the same
authorization/availability predicates in PostgreSQL and tests. At future scale,
committed product and course changes can be exported through an outbox to
Elasticsearch/OpenSearch while reapplying those predicates. No Elasticsearch
integration is active.

No payment provider, content transcoder, certificate PDF renderer, product
asset, course material, or S3 credentials are bundled. Unconfigured external
checkout/refund, media processing, PDF rendering, upload verification, and
signed download operations return explicit `503` errors and never persist or
report simulated success. The API does not claim that any real external
payment, media processing job, PDF rendering job, or S3 operation was verified
without deployment credentials and a configured real adapter.

## Music, global search, and progression

Migration `20260806_0008_music_progression` adds creator-owned music tracks,
user-owned playlists, saved-track libraries, XP progression, and achievements.
Tracks are intentionally not seeded with synthetic owners or fake audio:
creators and administrators create real track metadata through
`POST /v1/music/tracks`, then publish it through
`POST /v1/music/tracks/{track_id}/publish`.

Authenticated music browsing and libraries are available under `/v1/music`.
`GET /v1/search` searches the visible portions of social, gift, marketplace,
learning, live, music, and business-document data. Progression is available
through `/v1/progression/me` and `/v1/progression/achievements`; the achievement
catalog is seeded idempotently during application startup.

## Business workspaces and platform administration

Migration `20260731_0007_business_admin` adds tenant workspaces, memberships,
hashed single-use invitations, teams, CRM, tasks, calendar events, documents,
budgets, expenses, invoices, feature flags, versioned settings, account
administration actions, application-submitted service health reports, and
append-only business audit and financial evidence. Every business domain row
contains `workspace_id`; API lookups combine that identifier with an active
membership check and return no cross-workspace record.

The built-in `business` role receives `workspaces:create`, `business:access`,
`business:documents`, and `business:finance`. Workspace owner/admin/manager/
member/viewer roles are evaluated independently for each tenant, including
bounded per-membership permission overrides. Removing, suspending, or demoting
the last active owner is rejected. Account deletion likewise requires
ownership transfer, removes personal memberships, unused invitations, and
unversioned private drafts, while retaining business, finance, and audit
history against the pseudonymized account.

Principal business APIs are:

- `/v1/business/workspaces`, `/{id}/members`, `/{id}/invitations`, and
  `/{id}/teams` for workspace lifecycle, switching, membership, invitations,
  and teams;
- `/v1/business/crm/contacts`, `/companies`, `/deals`,
  `/pipeline-stages`, and `/jobs` for cursor search, assignment, configurable
  stages, append-only deal activity, and persisted queued import/export
  requests;
- `/v1/business/tasks` for optimistic-version task updates, parent/dependency
  cycle prevention, completion prerequisites, and append-only comments and
  activity;
- `/v1/business/calendar` and `/calendar/events` for bounded timezone-aware
  ranges, attendee conflict detection, reminders, and a validated
  `DAILY`/`WEEKLY`/`MONTHLY` recurrence subset;
- `/v1/business/documents`, `/documents/folders`, version upload/verify/
  download, and approval endpoints for S3-only object storage, immutable
  verified versions, rights declarations, classification ACLs, and persisted
  approval decisions;
- `/v1/business/finance/budgets`, `/budget-categories`, `/expenses`,
  `/invoices`, and `/v1/business/reports/finance` for integer-minor-unit
  records and aggregate reporting from persisted rows.

CRM import/export endpoints persist a real `queued` job boundary and do not
report completion. No worker implementation is bundled in this service.
External calendar sync, e-signature, and accounting export use provider
protocols injected by the deployment. Their default implementations return
`503 calendar_provider_unavailable`, `503 esignature_provider_unavailable`, or
`503 accounting_provider_unavailable`; they never record provider success.

Document object keys are server generated. Version creation obtains a real
presigned S3 PUT before persisting the declaration, verification performs a
real S3 `HEAD`, and download returns only a short-lived presigned GET.
Unconfigured S3 returns `503 object_storage_unavailable` without a successful
version record.

Expense approval is limited to submitted expenses and appends a decision.
Invoices move from `draft` to `sent`, then to `paid` only through a
signature-verified configured payment webhook or an authorized manual bank
reconciliation with exact amount/currency, evidence, an external reference,
and audit. A browser return or direct invoice patch cannot mark an invoice
paid. Fiat business records are not represented as `SYLORA_CREDIT` ledger
entries. Existing immutable ledger operations remain the source of truth only
for actual platform-credit activity.

Administration APIs under `/v1/admin` include:

- cursor user search/detail and audited suspend/restore with session
  revocation, self-suspension prevention, and last-active-admin protection;
- `/feature-flags` with optimistic versions, environment and allow/deny
  subjects, and deterministic server-side HMAC rollout evaluation;
- `/settings` with immutable versions and encrypted write-only secret values;
- `/audit` for an opaque-cursor view over security and selected business audit
  events;
- `/analytics` for counts and sums computed from persisted users, content,
  live sessions, orders, gifts, moderation records, and AI usage;
- `/service-health` for HMAC/timestamp-protected application report ingestion
  and admin reads; these reports supplement and do not replace Prometheus; and
- `/security` plus `/moderation/summary` for actual session, account,
  persisted security-event, integration, queue, and decision counts.

Set `SERVICE_HEALTH_HMAC_SECRET` to enable service-health ingestion. Producers
sign `X-Service-Timestamp + "." + raw_request_body` with HMAC-SHA256 and send
the lowercase hexadecimal digest in `X-Service-Signature`. If the secret is
absent, ingestion returns `503 service_health_ingestion_unavailable`.

## Security model

Access tokens are short-lived bearer JWTs supplied only in the
`Authorization` header. Refresh tokens are opaque 256-bit values; only SHA-256
hashes are stored, and every use rotates the token. Reuse revokes the entire
rotation family. Access authentication checks the database session, account
status, and user token version on every request.

Because the API does not authenticate with cookies, browsers do not
automatically attach API credentials and ordinary cookie-CSRF does not apply.
OAuth requires one short-lived `HttpOnly`, `Secure`, `SameSite=Lax` state
cookie; the callback verifies that cookie, the query state, nonce, and PKCE.

Verification and reset records store token hashes only. The durable email
outbox contains the message needed for later SMTP delivery and must receive the
same database access controls and encryption-at-rest policy as other sensitive
production data. Tokens, TOTP secrets, recovery codes, passwords, and message
bodies are never written to application logs.

## Social and messaging API

Authenticated social APIs are mounted at `/v1/social`. They cover public
handles and privacy-aware profiles, follows and follow requests, canonical
friendships, blocks and mutes, communities and channels, memberships and roles,
posts and feeds, polls, comments, reactions, reposts, bookmarks, search,
notifications, reports, and the RBAC-protected moderation queue. Feed,
notification, report, and post listing cursors are signed and opaque.

Authenticated messaging APIs are mounted at `/v1/messages`. Direct
conversations use one canonical pair key and non-friend conversations enter a
message-request state. Message and channel history use signed cursor
pagination. Message bodies and attachments, edits, soft deletion, delivery/read
receipts, and user-specific transport events are durable database records.
`/v1/ws/messages` accepts an access token only through the
`Authorization: Bearer` header, subscribes the socket only to that authenticated
user, supports replay through its signed `since` cursor, and uses a bounded
outgoing queue.

Media and message attachment references are metadata only. They must use
`https://` or `s3://bucket/key`; this service does not accept binary uploads.
Bodies are treated as plain text and HTML markup is rejected.

Search currently uses portable SQL `ILIKE`, including the SQLite behavior used
by tests. For larger PostgreSQL deployments, migrate the same authorization
predicates into indexed `tsvector` queries before changing ranking. At a scale
where an external search index is justified, publish committed content changes
through an outbox into Elasticsearch/OpenSearch and reapply privacy, community,
and block filters at query time. No Elasticsearch integration is currently
active.

WebSocket queues and connection bookkeeping are intentionally process-local;
the database remains the source of truth and every transport event is committed
before publication. Multi-replica deployments require Redis Streams, Kafka, or
equivalent fan-out plus consumer recovery to deliver committed events to
sockets attached to other replicas. No cross-replica Kafka/Redis fan-out is
currently implemented. Recommendation scoring is also local SQL/application
logic, transparently combining followed authors, joined communities, category
affinity, and recency; it is not represented as an AI model.
