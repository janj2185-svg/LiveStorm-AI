# IMPLEMENTATION_PLAN — SYLORA Phase 0 → next slices

**Audit date:** 2026-08-10  
**Principle:** modular monolith extensions; fail-closed externals; no fake READY; no fake UIs.

## Goal

Raise honesty and completeness of the **AI-native ecosystem** by finishing vertical slices that already have schemas/routers, before starting NOT_STARTED pillars that need new domains.

## Dependency order (do not skip)

```text
Identity hardening + prod flag safety
  → Personal AI (provider + memory retrieval decision + tool UX)
    → Trust & Safety case model
      → Creator commerce (PSP) ──┬→ Gift READY content (human art)
      → Live MediaMTX E2E      ─┘
        → Search (Postgres FTS / pgvector) before ES/Milvus
          → Developer Platform (API keys/webhooks) before Agent Marketplace
            → Knowledge Graph / Reputation / Provenance / Command Center
```

## Wave A — Honesty & safety (unblocks everything)

| Work | Outcome | Touch |
|---|---|---|
| A1. Production forbid test-stand/sandbox flags | Cannot mint fake money/email-verify in prod | `config.py`, `test_stand.py`, startup checks |
| A2. README/status tags from Phase 0 matrix | External claims match code | `README.md` |
| A3. Compose profiles: core vs experimental data planes | Default local without Kafka/ES/Milvus | `infrastructure/compose/` |
| A4. Live UI status enum surfacing | Never show connected when BLOCKED/SPEC | Flutter Live + `live` integrations API |
| A5. Archive/clarify stale PRODUCTION_READINESS baseline | Single NO-GO narrative | docs |

**Exit:** owner/docs/CI agree what is local-only vs blocked.

## Wave B — Personal AI depth (pillar 1)

| Work | Outcome | Touch |
|---|---|---|
| B1. Keep companion persona; add eval fixtures | Personality without policy regression | `sylora_persona.py`, tests |
| B2. Flutter emotion readout (optional) | Surfaces existing `/v1/ai/emotion` | `apps/sylora` |
| B3. Decide embeddings: pgvector **or** remove fields | End “disabled forever” lie | `ai_models`, `ai_service` |
| B4. Tool step-up UX for medium/high risk | Safer action loop | Flutter AI + API |
| B5. Usage dashboard polish | Cost control visible | `/v1/ai/usage*`, admin AI |

**Exit:** consent→chat→memory→tool approve works with configured provider; multimodal remains fail-closed until providers exist.

## Wave C — Live Creator Studio (pillar 7)

| Work | Outcome | Touch |
|---|---|---|
| C1. Unify adapter registry | One status source of truth | `live_adapters` + `live_platforms` |
| C2. MediaMTX local E2E documented + verify scripts | Already partially done — keep green | `verify-live.sh`, adapters |
| C3. Replace Null TTS only when voice provider configured | Honest cohost audio | `output.py`, AI voice jobs |
| C4. YouTube/Twitch connect behind real OAuth secrets | PARTIAL→provider-verified | adapters + owner secrets |
| C5. TikTok remains BLOCKED until written approval | No scraping | `tiktok/status.py` |

**Exit:** one platform live event → rule → action → AI text reply proven without Fake transport.

## Wave D — Commerce money path (pillar 11)

| Work | Outcome | Touch |
|---|---|---|
| D1. Choose PSP; implement real provider (not mock success) | Top-up/payout | `payments.py` |
| D2. KYC/KYB gating for payouts | Compliance skeleton | new models in monolith |
| D3. Keep sandbox path for local | Dev unchanged | test-stand flags |
| D4. Gift READY pipeline with human artists | Content, not code | art process; READY checklist |

**Exit:** one real sandbox charge → ledger credit → gift send; still no fake READY gifts.

## Wave E — Trust & Safety (pillar 13)

| Work | Outcome | Touch |
|---|---|---|
| E1. ModerationCase model + transitions | Durable cases | `social_models` + admin |
| E2. Appeals + dual-control for bans | Enterprise-ready T&S start | admin APIs |
| E3. Wire AI moderate into report intake | Assist, don’t auto-ban critical | `ai_service.invoke_moderation` |

## Wave F — Search & observability (pillars 16–17)

| Work | Outcome | Touch |
|---|---|---|
| F1. Postgres FTS for posts/users | Better than ILIKE | social search |
| F2. Optional pgvector for AI memory | Only after B3 | AI |
| F3. Do **not** enable ES/Milvus until F1 insufficient | Avoid TD-01 | compose |
| F4. Grafana AI cost panels from usage records | Cost control | observability |

## Wave G — Developer Platform (pillar 5) — only after Waves A–C

| Work | Outcome | Touch |
|---|---|---|
| G1. `developer_applications` + hashed API keys | First-party integrations | new module in `services/api` |
| G2. Signed outbound webhooks (user events) | Partner hooks | workers |
| G3. OAuth apps for third parties | Distinct from login OAuth | oauth extensions |
| G4. Thin official SDK (TS or Dart) later | Not before G1 | new `packages/sylora-sdk` |

## Wave H — Intentionally deferred NOT_STARTED pillars

Do **not** schedule fake UIs for:

| Pillar | Why wait |
|---|---|
| Knowledge Graph (3) | Needs entity model + ACL; use memory/FTS first |
| Agent Marketplace (4) | Needs Developer Platform + sandbox + ledger settlement |
| Reputation (12) | Needs abuse-resistant signals from T&S + commerce |
| Content provenance (14) | Needs media pipeline + legal |
| Command Center (15) | Needs stable AI+Live+Admin primitives |
| AI-to-AI economy (10 economy half) | Needs G + ledger escrow design; keep Live Action Engine evolving separately |

## Mapping to status targets

| Pillar | Now | Next honest target |
|---|---|---|
| 1 Personal AI | PARTIAL | PARTIAL→stronger PARTIAL (not DONE without multimodal+eval) |
| 2 Identity | PARTIAL | PARTIAL (DONE only after passkeys/KYC decision) |
| 3 KG | NOT_STARTED | stay until Wave H |
| 4 Agent Marketplace | NOT_STARTED | after G |
| 5 Developer Platform | NOT_STARTED | Wave G |
| 6 Translation | PARTIAL | PARTIAL (realtime later with Live) |
| 7 LIVE | PARTIAL/BLOCKED | provider-gated |
| 8 Business OS | PARTIAL | deepen finance when PSP exists |
| 9 Enterprise AI | PARTIAL | tenant policies after orgs mature |
| 10 Action Engine | PARTIAL | deepen Live actions; economy deferred |
| 11 Commerce | PARTIAL/BLOCKED | Wave D |
| 12 Reputation | NOT_STARTED | deferred |
| 13 T&S | PARTIAL | Wave E |
| 14 Provenance | NOT_STARTED | deferred |
| 15 Command Center | NOT_STARTED | deferred |
| 16 Search | PARTIAL | Wave F |
| 17 Observability | PARTIAL | Wave F |
| 18 Admin | PARTIAL | grow with E + G |

## Working agreements

1. Every new endpoint ships with API test + Flutter or explicit “API-only” note.  
2. Unavailable capabilities return structured errors; UI shows unavailable — never synthetic success.  
3. Gallery screens may prototype visuals but must not be cited as DONE.  
4. Prefer new tables in `services/api` over new deployables.  
5. External provider work requires the five gates in `EXTERNAL_CAPABILITIES.md`.

## Suggested first engineering tickets (concrete)

1. `config`: assert `ENVIRONMENT=production` rejects `test_stand_sandbox_wallet` and auto-verify.  
2. Compose: `profiles: [experimental-search]` for elasticsearch/milvus/kafka.  
3. Live integrations list: return platform `integration_status` from single registry.  
4. AI: document emotion as ephemeral; add Flutter optional panel or hide.  
5. ModerationCase alembic migration + admin list/detail APIs.  
6. PSP spike behind `PaymentProvider` protocol (Stripe candidate) with webhook signature tests.

## Out of scope for autonomous agents alone

- Provider app review / LIVE partner contracts  
- AAA gift art, rights clearance, device FPS QA  
- Store signing, APNs/FCM accounts  
- Legal/compliance sign-off  
- Real production cluster cutover secrets (`getsylora.com` stacks remain owner-gated)
