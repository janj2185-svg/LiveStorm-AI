# ARCHITECTURE_AUDIT — SYLORA Phase 0

**Audit date:** 2026-08-10  
**Scope:** structural reality vs AI-native ecosystem vision

## Target shape (from existing roadmap)

`docs/implementation/IMPLEMENTATION_ROADMAP.md` correctly calls for a **modular monolith first**, with separate media and AI gateway data planes only when measured need exists. That remains the right north star.

## What is actually implemented

```text
Flutter (apps/sylora) ─┐
Gift Studio (apps/gift-studio) ─┼─► FastAPI modular monolith (services/api)
OBS companion (services/companion) ─┘         │
                                              ├─ PostgreSQL (authoritative state)
                                              ├─ Redis (rate limits / ephemeral)
                                              ├─ S3/MinIO (when configured)
                                              ├─ Celery workers (outbox / jobs)
                                              └─ MediaMTX / Coturn (streaming plane)
```

Routers registered in `services/api/app/main.py`: health, diagnostics, test_stand, auth, oauth, users, admin*, ai, social, messaging, ledger, live (+ admin/ws), gifts (+ authoring/admin/ws), creator_platform, marketplace, learning, business*.

Domain modules are **file-separated** (`*_models.py`, `*_service.py`, `routers/*`) inside one deployable API — a modular monolith, not microservices.

## Architectural strengths

1. **Fail-closed externals** — `UnconfiguredPaymentProvider`, unconfigured storage/email/certificate/e-sign/content processor raise explicit errors; no simulated success (`payments.py`, `storage.py`, `platform_service.py`, `business_service.py`).
2. **Server-authoritative money** — immutable double-entry ledger (`ledger_models.py`) with gift commerce separation.
3. **Consent + quota gates on AI** — `require_consent`, `enforce_quota` in `ai_service.py`.
4. **Live adapter honesty** — TikTok `BLOCKED_BY_PROVIDER_ACCESS`; FB/IG/YouTube/Twitch/Discord platform stubs; FakeTikTokTransport test-only.
5. **RBAC permission matrix** — seeded in `database.py` (`PERMISSION_DESCRIPTIONS`, `ROLE_MATRIX`).
6. **Security middleware** — CSP, rate limits, production startup secret checks (`main.py`, `middleware.py`, `config.py`).

## Architectural conflicts / hazards

| Conflict | Evidence | Risk |
|---|---|---|
| **Orphan data plane services** | Compose runs Kafka, Elasticsearch, Milvus (`infrastructure/compose/compose.yml`) but **zero** references in `services/api/app` Python code | Implies platform capabilities that do not exist; ops cost without product value |
| **Dual product surfaces** | Flutter product vs Lumen gallery fixtures (`src/screens/data.ts`) vs README claims | Stakeholders may treat gallery/missions/shorts/stories as shipped product |
| **Two Live adapter layers** | `live_adapters.py` (YouTube/Twitch/Discord/OBS/MediaMTX implementations) **and** `live_platforms/*` stubs/TikTok | Confusion about which path is canonical for multi-platform LIVE |
| **Null cohost outputs** | `NullSpeechSynthesizer`, `NullAvatarController` in `live_platforms/common/output.py` | Unit-testable cohost without proving TTS/avatar LIVE |
| **Emotion is heuristic, not durable state** | `sylora_persona.py` regex mood + `/v1/ai/emotion`; no `AIEmotion` table | Product may overclaim “emotion engine” |
| **Memory embeddings disabled** | `AIEmbeddingState.disabled` on create/patch; no Milvus/pgvector retrieval loop | “Memory” is CRUD encrypted rows, not a knowledge graph |
| **README vs EXTERNAL_CAPABILITIES** | README lists many capabilities; EXTERNAL_CAPABILITIES still “not integrated / not verified” for most providers | Marketing/ops mismatch |
| **PRODUCTION_READINESS dual narrative** | File still contains gallery-only “Initial baseline” section that contradicts Stage 2 reassessment | Stale docs can reverse prior progress narrative |
| **Credit marketplace without PSP** | Marketplace checkout exists; payment provider always unconfigured by default | Commerce UI without money movement |
| **Infra placeholders in K8s** | `*.example.invalid` hosts in production configmaps | Cannot treat K8s overlay as deployed production |

## Module boundary health

| Domain | Boundary quality | Notes |
|---|---|---|
| Identity | Good | `models.py` + `auth_service.py` + routers |
| Social/messaging | Good | Dedicated models/service |
| AI Brain | Good | Models/providers/service/persona |
| Live Hub | Mixed | Rich models; adapter/platform split |
| Ledger/gifts | Good | Clear separation + WS delivery |
| Marketplace/learning/creator | Good schemas | Dependent on unconfigured processors/PSP |
| Business OS | Large surface in one service | Acceptable for monolith; finance settlement webhook-gated |
| Search / KG / Agents / Dev Platform | Absent | Must not be faked as separate services |

## Recommended architecture posture (Phase 0 → Phase 1)

1. Keep **one modular monolith**; add packages only when a domain has a hard isolation need.  
2. **Do not** wire Kafka/ES/Milvus until a concrete use case + ACL model exists (roadmap already prefers Postgres/`pgvector` first).  
3. Treat gallery (`src/`) as non-authoritative forever for product claims.  
4. Collapse Live adapter story into one registry with explicit status enum per platform.  
5. Extend Action Engine inside Live + AI tool proposal tables before inventing an “AI-to-AI economy” service.  
6. Developer Platform should be first-party API keys + webhooks on the monolith — not a fake portal.  
