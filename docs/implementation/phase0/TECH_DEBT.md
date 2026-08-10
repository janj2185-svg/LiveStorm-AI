# TECH_DEBT — SYLORA Phase 0

**Audit date:** 2026-08-10

## Executive list

| ID | Debt | Severity | Evidence |
|---|---|---|---|
| TD-01 | Orphan Compose services (Kafka/ES/Milvus) unused by API | High | `infrastructure/compose/compose.yml` vs zero app refs |
| TD-02 | Dual Live adapter systems | High | `live_adapters.py` + `live_platforms/*` |
| TD-03 | Design gallery mistaken for product | High | `src/screens/data.ts`, game/media screens without API |
| TD-04 | Stale / contradictory docs | High | `PRODUCTION_READINESS.md` initial baseline; older EXTERNAL_CAPABILITIES tone vs Stage 2 code |
| TD-05 | README capability list vs fail-closed reality | Medium | Root `README.md` “Implemented platform capabilities” |
| TD-06 | Null TTS/Avatar cohost defaults | Medium | `live_platforms/common/output.py` |
| TD-07 | Emotion heuristic without persistence | Medium | `sylora_persona.py` |
| TD-08 | Memory embedding fields always disabled | Medium | `ai_service.create_memory` |
| TD-09 | Gift library READY=0 vs large artifact surface | Medium | `artifacts/gift-library`, `GIFT_LIBRARY_STATUS.md` |
| TD-10 | Flutter feature shells thinner than API | Medium | Admin/business/learning vs huge API surface |
| TD-11 | Process-local AI event fan-out | Medium | `AIEventHub` |
| TD-12 | Payments always unconfigured provider factory | Medium | `payments.get_payment_provider` |
| TD-13 | Content processor / certificate / e-sign stubs | Medium | `platform_service.py`, `business_service.py` |
| TD-14 | Search via `ILIKE` only | Low–Med | `routers/social.py` |
| TD-15 | K8s example.invalid placeholders | Low | `infrastructure/kubernetes/base/configmap.yaml` |
| TD-16 | Repo remote name LiveStorm-AI vs product SYLORA | Low | identity docs |
| TD-17 | Few Alembic revisions for huge schema | Medium | `alembic/versions` count (~7) — large migrations harder to review |
| TD-18 | Test FakeRedis / TestProvider vs product config | Low | intentional; watch leakage |
| TD-19 | Gallery LiveProbePanel / fixture UI retained | Low | `src/screens/lib/LiveProbePanel.tsx` |
| TD-20 | No public SDK package despite ecosystem vision | Med | `packages/` only `gift-runtime` |

## Mocks / placeholders / fake data inventory

| Item | Kind | Path | Allowed? |
|---|---|---|---|
| Design fixture CREATORS/posts/etc. | Fake product data | `src/screens/data.ts` | Yes — design only |
| Missions / achievements / leaderboards | Visual-only | `src/screens/game/*` | Yes — design only |
| Stories / shorts / long video | Visual-only | `src/screens/media/*` | Yes — design only |
| FakeTikTokTransport | Test double | `live_platforms/tiktok/transport.py` | Tests only |
| FakeRedis | Test double | `tests/conftest.py` | Tests only |
| Flutter test fakes | Test double | `apps/sylora/test/fakes.dart` | Tests only |
| NullSpeech/Avatar/OBS/Gift controllers | Dev null I/O | `live_platforms/common/output.py` | Must not prove LIVE |
| UnconfiguredPaymentProvider | Fail-closed stub | `payments.py` | Correct pattern |
| UnconfiguredContentProcessor / CertificateRenderer / ESign | Fail-closed stub | platform/business services | Correct pattern |
| Sandbox wallet credit | Non-card money | `stand_provisioning.py`, `scripts/sandbox_topup.py` | Local/test-stand only |
| Gift SPEC_ONLY catalog entries | Spec not product-ready | `artifacts/gift-library/**` | Honest SPEC OK |
| Live platforms SPEC_ONLY stubs | Status stubs | facebook/instagram/youtube/twitch/discord `__init__.py` | Honest status OK |
| AssistantScreen gallery copy | Design | `src/screens/assistant` | Not Flutter product |

## Documentation debt

1. Update or archive the gallery-only section of `PRODUCTION_READINESS.md` so Stage 2 reassessment is the default reader path.  
2. Annotate README capabilities with **status tags** (DONE/PARTIAL/BLOCKED).  
3. Keep Phase 0 docs in `docs/implementation/phase0/` as the living inventory.  
4. Reconcile prior audits that pre-date `sylora_persona` / `/v1/ai/emotion`.

## Code / product debt recommendations

1. **Remove or profile-gate** Kafka/ES/Milvus from default local Compose until wired.  
2. **Unify Live adapters** behind one registry returning `LivePlatformIntegrationStatus`.  
3. **Split Flutter routes** so unfinished domains show unavailable from diagnostics, not empty CRUD optimism.  
4. **Add OpenAPI → Dart client generation** to reduce hand-written repository drift (`repositories.dart` is large).  
5. **Persist emotion snapshots** only if product requires history; otherwise document as ephemeral heuristic.  
6. **Either implement pgvector memory retrieval or delete embedding columns** to avoid false readiness.  
7. Keep fail-closed stubs; never replace with success mocks.

## Conflict with “prefer modular monolith”

Debt that tempts premature microservices (agent marketplace, KG, command center) should be **tables + routers inside `services/api`** first. The existing gift/AI/live split already shows the monolith can host large domains without fake UIs.
