# SYLORA post-migration roadmap

**Canonical baseline:** `main` @ `7e91b07849b8ac6000579743bf60ad7c984581a7`  
**Gift honesty (unchanged):** READY=0 · ASSETS_BUILT_NOT_READY=8 · SPEC_ONLY=92  
**Do not** merge `janj2185-svg/Sylora` dashboard into this tree.

## Priority legend

| Rank | Meaning |
|---|---|
| **Critical** | Blocks production cutover or live core product |
| **High** | Core loop incomplete; needed soon after cutover |
| **Medium** | Important product surface; can follow core loops |
| **Low** | Polish / later expansion |

---

## Ranked backlog

### Critical

| # | Area | Task | Notes |
|---|---|---|---|
| C1 | AI Brain | Configure production `OPENAI_API_KEY` on restored stack | Owner secret required |
| C2 | Platform | Public cutover of `getsylora.com` after live AI PASS | Proxy switch only; keep old deploy until approved |
| C3 | AI Brain | Re-run live chat + stream verify (`verify-ai.sh` / provider status) | Gate for C2 |

### High

| # | Area | Task | Notes |
|---|---|---|---|
| H1 | Infrastructure | Real SMTP (or keep staging auto-verify until SMTP ready) | Required for `APP_ENVIRONMENT=production` |
| H2 | Infrastructure | Durable object storage (R2) or persistent MinIO ops plan | Uploads work on MinIO today |
| H3 | Gift Studio | Publishing pipeline soft-ping → send/WS proof → READY | Still 0 READY |
| H4 | Wallet | Sandbox top-up → real payment provider path | Payment currently fail-closed |
| H5 | AI Brain | Memory UX + consent defaults in Flutter client | Backend CRUD exists |
| H6 | Mobile | Ship Flutter Android/iOS against production API | Web build already proven |

### Medium

| # | Area | Task | Notes |
|---|---|---|---|
| M1 | Gift Studio | Author roles, upload UX, catalog browse | Studio app exists |
| M2 | AI Brain | Tool proposal approve/reject end-to-end in client | API routes exist |
| M3 | Voice | TTS/STT provider integration | Not production-wired |
| M4 | Company/Business | Workspace CRM/finance hardening | Schema + APIs present |
| M5 | Wallet | Creator earnings / payouts polish | Ledger exists |

### Low

| # | Area | Task | Notes |
|---|---|---|---|
| L1 | Avatar | Live avatar / VRM pipeline (new SYLORA path, not old LiveStorm) | Prior Replit avatar assets are not this baseline |
| L2 | Voice | Multi-language voice packs | After Voice MVP |
| L3 | Gifts | Blender art pass for priority 8 + remaining 92 SPEC_ONLY | Hiring/content |
| L4 | Platform | Observability / HMAC service health | Optional hardening |

---

## Suggested execution order

1. **C1 → C3 → C2** (OpenAI → verify → cutover)  
2. **H1 / H2** in parallel with post-cutover monitoring  
3. **H3 / H5 / H6** product loops  
4. **M*** then **L***

## Current blockers (ops)

- `OPENAI_API_KEY` empty on `/root/Sylora-restored`  
- `SMTP_HOST` empty (OK only while staging + `TEST_STAND_AUTO_VERIFY_EMAIL`)  
- Public domain still on previous Next.js deploy until C2
