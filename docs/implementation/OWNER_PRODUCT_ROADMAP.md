# SYLORA — Product Roadmap (beyond gifts)

**Goal:** raise platform from ~4.5 → 7 → 9+ without pretending gifts are DONE.  
**Mode:** owner asked agent to proceed sequentially (`Роби сам послідовно`). Keys/hiring still blocked until provided.

---

## Phase 1 — Product loops that work locally — DONE

| Deliverable | Status |
|---|---|
| Seed handles / wallets / follows / posts / DMs | `scripts/seed_product_demo.py` |
| Product-loop verify | `./verify-product-loop.sh` |
| Hooked into start/verify-local | done |
| Diagnostics `product_loop` | done |

Exit: verify PASS · gifts READY=0.

---

## Phase 2 — Live client + money path — DONE (no Stripe/OpenAI)

| Deliverable | Status |
|---|---|
| Sandbox top-up (admin issuance) | `scripts/sandbox_topup.py` |
| Gallery Demo / Live / Catalog badges | done |
| Live probes on Auth / Feed / Wallet (fixture UI kept) | `src/screens/lib/LiveProbePanel.tsx` |
| Flutter local runner | `scripts/run-flutter-local.sh` |
| Flutter wallet fail-closed + sandbox hint | `platform_screens.dart` |
| Payment | fail-closed (no provider) |
| AI | skipped (no key) |

Override later: Stripe · OpenAI key · Flutter SDK on owner machine.

---

## Phase 3 — Live + AI — WORKING (local)

| Deliverable | Status |
|---|---|
| MediaMTX host binary | `./scripts/start-mediamtx-local.sh` |
| Control API wired | `MEDIAMTX_CONTROL_*` in gitignored `.env` |
| Live create → `ingest_provisioned=true` | PASS |
| Live preflight → ready | PASS |
| Adapter fix for MediaMTX 1.19 + authInternalUsers | `live_adapters.py` (no legacy path publishPass) |
| OpenAI live chat | PASS (`./verify-ai.sh`) |
| Verify | `./verify-live.sh` |

OBS/ffmpeg publish uses global publish user from `.sylora-local/mediamtx.env`  
(`MTX_AUTHINTERNALUSERS_0_*`) on `rtmp://127.0.0.1:1935/<ingest_path>?user=…&pass=…`.

---

## Phase 4 — Gift content quality — PREP ONLY (hiring pending)

| Deliverable | Status |
|---|---|
| Honest gap report (never promotes READY) | `scripts/gift-library/report_readiness_gaps.py` |
| READY count | **0** (unchanged) |
| Hiring pilot 3 gifts | **blocked** until owner approves budget |

---

## Confirmation log

| Date | Gate | Decision |
|---|---|---|
| 2026-08-01 | Start Phase 1 | Owner: start |
| 2026-08-01 | Start Phase 2 | Owner reply `2` |
| 2026-08-01 | Proceed sequentially | Owner: `Роби сам послідовно` — agent continues without keys/hiring |
| 2026-08-01 | OpenAI key provided | Wired to gitignored env + admin provider; initially blocked by insufficient_quota |
| 2026-08-01 | OpenAI billing topped up | Live chat PASS — `./verify-ai.sh` OK (`SYLORA_AI_OK`) |
| 2026-08-01 | MediaMTX local | Host MediaMTX + ingest provision + preflight ready |
| | Payment | fail-closed |
| | AI | **live** (gpt-4o-mini) |
| | Live ingest | **local MediaMTX working** |
| | Phase 4 hiring | _pending_ |
