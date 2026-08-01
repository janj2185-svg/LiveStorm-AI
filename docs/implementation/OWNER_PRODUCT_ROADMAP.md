# SYLORA — Product Roadmap (beyond gifts)

**Goal:** raise platform from ~4.5 → 7 → 9+ without pretending gifts are DONE.  
**Rule:** owner confirms each phase gate before spend on keys/hiring.

---

## Phase 1 — Product loops that work locally (NOW)

**No API keys. No hiring.**

| Deliverable | Status |
|---|---|
| Roadmap + confirmation gates | done |
| Seed handles, follows, posts, DMs, wallet balances for test accounts | `scripts/seed_product_demo.py` |
| Automated product-loop verify | `scripts/verify_product_loop.py` + `./verify-product-loop.sh` |
| Hook into `./start-local.sh --host` + `./verify-local.sh` | done |
| Diagnostics shows product-loop summary | `GET /v1/diagnostics` → `product_loop` |

**Exit criteria (you confirm):**
- [x] `./verify-product-loop.sh` or `python3 scripts/verify_product_loop.py` = PASS (agent verified 2026-08-01)
- [ ] Owner can login, see balance > 0, see a feed post, open DM path (your local check)
- [x] Still honest: gifts READY = 0

---

## Phase 2 — Live client + money path (IN PROGRESS)

**Owner signal 2026-08-01:** reply `2` → start Phase 2.  
**Defaults until you override:** payment stay fail-closed · AI skip · gallery + Flutter prep (no Stripe/OpenAI keys).

| Deliverable | Status |
|---|---|
| Documented sandbox top-up (admin issuance; not real card charges) | `scripts/sandbox_topup.py` |
| Gallery Demo data / Live API / Static catalog badges | `src/showcase/App.tsx` + `dataSource` on key screens |
| Flutter local API runner | `scripts/run-flutter-local.sh` (+ `.ps1`) |
| Payment stays fail-closed | yes — `POST /v1/wallet/topups` still Provider not configured |
| AI provider | skipped (no key) |

Confirm to change defaults:
1. **Payment provider?** Stripe / another / ~~stay fail-closed~~ (current)
2. **AI provider?** OpenAI key / ~~skip~~ (current)
3. **Flutter focus?** Yes on your machine / gallery-only for now

Work remaining when you override:
- Wire Stripe (or other) payment provider
- Add OpenAI key for AI routes
- Owner runs Flutter SDK + `./scripts/run-flutter-local.sh`

---

## Phase 3 — Live streaming + AI (NEEDS KEYS + HARDWARE QA)

- MediaMTX path verified on phone
- AI mic → text → voice with real provider
- Device FPS/RAM for gifts still separate track

---

## Phase 4 — Gift content quality (NEEDS HIRING APPROVAL)

- Pilot 3 READY gifts with art team
- Scale only after accept

---

## Confirmation log

| Date | Gate | Decision |
|---|---|---|
| 2026-08-01 | Start Phase 1 | Owner: start; will confirm further |
| 2026-08-01 | Start Phase 2 | Owner reply `2`; defaults: fail-closed payment, AI skip, gallery+Flutter prep |
| | Phase 2 payment | fail-closed (override anytime) |
| | Phase 2 AI | skip (override anytime) |
| | Phase 4 hiring | _pending_ |
