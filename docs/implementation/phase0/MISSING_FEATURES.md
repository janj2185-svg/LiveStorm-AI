# MISSING_FEATURES — SYLORA Phase 0

**Audit date:** 2026-08-10  
**Legend:** DONE / PARTIAL / BLOCKED / NOT_STARTED  
**Rule:** evidence paths only; gallery fixtures ≠ features

---

## 1. Personal AI — **PARTIAL**

### Exists
| Capability | Evidence |
|---|---|
| Chat conversations + stream | `services/api/app/routers/ai.py`, `ai_service.py` |
| Consent + settings + capability flags | `ai_models.AIUserSettings`, `PATCH /v1/ai/settings` |
| Encrypted memory CRUD + export | `AIMemory`, `/v1/ai/memory*` |
| Tool proposals approve/reject/execute | `AIToolDefinition/Proposal/Execution`, tools: profile/settings/draft_post/notification/export |
| Usage accounting + quotas | `AIUsageRecord`, `enforce_quota` |
| Living companion persona + heuristic emotion | `sylora_persona.py`, `GET/POST /v1/ai/emotion`, tests `test_sylora_persona.py` |
| Multimodal job orchestration (protocol) | `AIJob`, capabilities image/video/music/voice/avatar |
| Flutter AI screens | `apps/sylora/lib/features/platform/platform_screens.dart` |
| Admin provider/prompt config | `routers/admin_ai.py` |

### Missing / incomplete
- Durable emotional state model / affective memory (emotion is request-time heuristic)
- Flutter UI for `/emotion` (no matches under `apps/sylora/lib`)
- Retrieval over memory embeddings (always `embedding_state=disabled`)
- STT / realtime voice assistant channel
- Tool marketplace / third-party tools (only 5 first-party tools)
- Provider-backed multimodal when keys absent → 503 fail-closed (expected, not DONE)

---

## 2. Identity — **PARTIAL**

### Exists
| Capability | Evidence |
|---|---|
| Register, email verify, login, refresh, logout, sessions | `routers/auth.py` |
| Password reset, TOTP 2FA | `auth.py`, `TOTPEnrollment` |
| OAuth/OIDC start/callback (config-gated) | `routers/oauth.py` |
| Profiles + account settings | `routers/users.py`, `Profile`, `AccountSettings` |
| RBAC roles/permissions | `models.Role/Permission`, `database.ROLE_MATRIX`, `routers/admin.py` |
| Soft-delete own account | `DELETE /users/me` |

### Missing
- KYC / government ID verification
- Graduated privacy levels beyond `profile_visibility` public|private
- Passkeys / WebAuthn
- Device trust / continuous auth
- Verified creator badge system (gallery shows “verified”; no API model)

---

## 3. Knowledge Graph — **NOT_STARTED**

### Exists
- None as product domain (no entity/edge tables, no graph API)
- Compose/K8s mention Milvus/Elasticsearch — **not consumed** by `services/api`

### Missing
- Entity types, relations, ACL-scoped graph queries
- Ingestion from social/AI/live events
- Citation binding from graph → chat
- Admin graph explorer

---

## 4. Agent Marketplace — **NOT_STARTED**

### Exists
- Product **commerce** marketplace (`marketplace_*` tables) — digital goods/services, **not** AI agents
- Live `LivePluginManifest` webhook_url field — live plugin metadata, not agent store

### Missing
- Agent listing, versioning, install, pricing, reviews for agents
- Sandbox execution + permission manifests for third-party agents
- Revenue share for agent authors

---

## 5. Developer Platform — **NOT_STARTED**

### Exists
- First-party OpenAPI at `/docs`
- Live integration webhooks (`/v1/live/webhooks/{platform}/{connection_id}`)
- Payment webhook route (provider unconfigured)
- OAuth for **user login**, not for third-party apps

### Missing
- Developer accounts, API keys, OAuth client apps, scoped tokens
- App review, rate tiers, webhook subscriptions for partners
- Public SDKs (only `packages/gift-runtime` exists)
- Developer portal UI

---

## 6. Real-time translation — **PARTIAL**

### Exists
- `POST /v1/ai/translate` + Flutter language tools dialog
- Provider protocol `TranslationProvider`
- Content processing op literal `"captions"` in schemas — **UnconfiguredContentProcessor**

### Missing
- Live chat/stream realtime translation plane
- Caption pipeline with storage + player sync
- Language detection persistence / viewer locale preferences beyond AI settings

---

## 7. AI Creator Studio / LIVE — **PARTIAL** / platforms **BLOCKED**

### Exists
| Capability | Evidence |
|---|---|
| Live sessions, destinations, rules, personas, turns, games | `live_models.py`, `routers/live.py` |
| MediaMTX / RTMP / WHIP adapters | `live_adapters.py`, `infrastructure/streaming` |
| OBS companion | `services/companion/` |
| Cohost scheduler + personalities | `live_platforms/common/cohost.py` |
| Viewer consent/memory tables | `LiveViewerConsent`, `LiveViewerMemory` |
| Flutter Live Studio | `platform_screens.dart` Live* |
| Creator content lifecycle | `creator_platform.py`, `platform_models.py` |
| Gift Studio (authoring) | `apps/gift-studio/` |

### Missing / blocked
- TikTok LIVE: `BLOCKED_BY_PROVIDER_ACCESS` (`live_platforms/tiktok/status.py`)
- YouTube/Twitch/Discord: adapters exist but need OAuth secrets; `live_platforms/*` stubs still SPEC_ONLY
- Facebook/Instagram: SPEC_ONLY stubs
- Kick: no package under `live_platforms/`
- Real TTS/avatar (Null* controllers)
- End-to-end cohost gift→speech production proof
- AAA Creator Studio for video editing / shorts / stories (gallery-only under `src/screens/media`, `src/screens/game`)

---

## 8. Business OS / Organizations — **PARTIAL**

### Exists
- Workspaces, teams, invitations, CRM, tasks, calendar, documents, budgets, expenses, invoices  
  (`business_models.py`, `routers/business.py`, `business_operations.py`, Flutter `features/business/`)

### Missing
- Real e-signature provider (unconfigured)
- External accounting export providers (unconfigured)
- Multi-entity tax/compliance packs
- SCIM / enterprise directory sync

---

## 9. Enterprise AI Control Plane — **PARTIAL**

### Exists
- Admin AI: providers, prompts, cross-user usage (`routers/admin_ai.py`)
- Per-user spend/token limits
- Feature flags / platform settings (`admin_operations.py`)

### Missing
- Tenant-level AI policy packs (DPA, residency, allow/deny models)
- Dual-control admin actions for high-risk AI changes
- Eval harness / red-team queues as product features
- SSO-enforced org AI seats

---

## 10. AI-to-AI economy / Action Engine — **PARTIAL**

### Exists
- Live Action Engine: queue → approve → execute with transitions (`LiveAction*`, `live_service.py`)
- AI tool proposal lifecycle with risk levels
- Credit ledger that *could* settle agent work later

### Missing
- Agent-to-agent contracts, bidding, escrow, SLA metering
- Cross-tenant action marketplace
- Metered tool billing between agents
- Autonomous settlement without human approve for high-risk actions (intentionally absent — good)

Status note: Action Engine for **live automations** is PARTIAL; **AI-to-AI economy** specifically is **NOT_STARTED**.

---

## 11. Creator Commerce — **PARTIAL** / payments **BLOCKED**

### Exists
- Double-entry ledger, wallet, payment operation records
- Gifts: catalog, inventory, send, delivery WS, refunds, authoring review/publish
- Marketplace: stores, products, cart, orders, entitlements, bookings, reviews
- Creator subscriptions + credit settlement paths
- Flutter wallet/gifts/marketplace screens

### Missing / blocked
- Configured PSP (`UnconfiguredPaymentProvider`) — real top-up/payouts
- KYC/KYB for payouts
- Gift READY assets = **0** (`GIFT_LIBRARY_STATUS.md`); 9 ASSETS_BUILT_NOT_READY
- App Store / Play Billing

---

## 12. Reputation — **NOT_STARTED**

No `reputation` / `trust_score` models, routers, or Flutter features found.

Gallery leaderboards (`src/screens/game/LeaderboardsScreen.tsx`) are fixtures only.

---

## 13. Trust & Safety / moderation — **PARTIAL**

### Exists
- Content reports + moderation actions (`social_models`, social moderation routes)
- Admin moderation summary (`/admin/moderation/summary`)
- AI moderation endpoint (`POST /v1/ai/moderate`)
- Live moderation decisions + ban actions
- User suspend/restore
- Cohost hard safety policy (`SafetyPolicy` in cohost.py)

### Missing
- Durable moderation **case** workflow, evidence packs, appeals
- Policy versioning / strike system
- CSAM/hash matching / vendor Trust & Safety integrations
- Push escalation / on-call binding

---

## 14. Content provenance — **NOT_STARTED**

No C2PA, content signing, watermark registry, or provenance manifests in product code. Mentions only in roadmap/readiness docs.

Gift assets have hashes for integrity of authored assets — **not** public content provenance.

---

## 15. Command Center / global AI layer — **NOT_STARTED**

No global AI orchestration dashboard beyond:
- AI Brain user UI
- Live Hub session controls
- Admin AI usage/providers

Missing: cross-domain intent routing, org-wide AI command palette, multi-agent supervisor service.

---

## 16. Search — **PARTIAL**

### Exists
- `/v1/social/search/{users,posts,communities}` via SQL `ILIKE` (`routers/social.py`)
- Gift `search_tags` fields
- Design gallery Search screen (fixtures)

### Missing
- Global unified search (creators + live + products + AI memory)
- Elasticsearch/OpenSearch product integration (Compose service unused)
- Vector/semantic search productization
- Ranking / personalization

---

## 17. Observability / cost control — **PARTIAL**

### Exists
- `/metrics`, `/health/live|ready`
- Prometheus/Grafana/exporters in Compose (`infrastructure/observability`, `docs/OBSERVABILITY.md`)
- Structured JSON logging middleware
- AI usage records + monthly token/spend limits
- Admin analytics + service-health ingest

### Missing
- Production Alertmanager routing / owned on-call
- Org-level AI budget dashboards with enforcement beyond per-user settings
- Cost anomaly detection
- Verified distributed tracing in a real cluster (OTLP documented, not proven here)

---

## 18. Admin platform — **PARTIAL**

### Exists
- Roles/permissions CRUD, user suspend, feature flags, settings, audit, security dashboard, analytics
- Admin AI + live admin + gifts admin routers
- Flutter `features/admin/`

### Missing
- Full moderation case console
- Impersonation with dual control
- Runbook-linked incident UI
- Multi-admin approval workflows
- Customer support tooling (tickets)

---

## Cross-cutting missing product loops

| Loop | Status |
|---|---|
| Register → verify email via real SMTP → login | PARTIAL (Mailpit/local OK; prod SMTP owner-gated) |
| Wallet top-up with real card | BLOCKED (no PSP) |
| Publish READY gift → send on live → render | BLOCKED (READY=0 + media QA) |
| Connect YouTube/Twitch LIVE → normalized events → AI reply | PARTIAL code / BLOCKED credentials |
| TikTok LIVE | BLOCKED |
| AI chat with memory personalization | PARTIAL (needs provider + consent) |
| Marketplace order with external payment | BLOCKED |
| Course certificate PDF | BLOCKED (renderer unconfigured) |
