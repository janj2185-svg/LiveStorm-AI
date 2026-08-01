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

## Phase 2 — Live client + money path (NEEDS YOUR CONFIRM)

Confirm before start:

1. **Payment provider?** Stripe / another / stay fail-closed for now  
2. **AI provider?** OpenAI key / skip  
3. **Flutter focus?** Yes (need Flutter SDK on your machine) / browser gallery only for now  

Work when confirmed:
- Real top-up or documented sandbox top-up
- Flutter pointed at local/staging API for login → wallet → feed
- Push “demo data” vs “live API” badges in gallery

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
| | Phase 2 payment | _pending_ |
| | Phase 2 AI | _pending_ |
| | Phase 4 hiring | _pending_ |
