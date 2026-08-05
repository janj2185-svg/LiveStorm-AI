# SYLORA — Brutal Self-Review (Gate Before Next Implementation)

**Date:** 2026-08-05  
**Live build:** `quality-living-aura` @ https://getsylora.com  
**Authority:** `design/approval-complete-product/` (FINAL-00…19) + this message’s owner overrides  
**Overall verdict:** **NOT WORLD-CLASS. NOT VISION-COMPLETE.**  
Scaffolding is real. The product is still a **PARTIAL companion + PARTIAL studio** wearing champagne tokens — not yet an AI-first creator OS people would recognize as SYLORA at first glance.

---

## 0. One-sentence truth

We can register, talk to a branded chat, and go live on native MediaMTX — but Aura is still mostly a chatbot with cosmetic emotion, most FINAL screens are PARTIAL/MISSING, auth still mixes social login with Live platforms, and the UI still feels like a capable prototype rather than a premium living world.

---

## 1. Owner overrides recorded (2026-08-05)

These **supersede** the Aug 4 `OWNER_SERVICES_AND_DECISIONS.md` where they conflict:

| Topic | Previous approval package | **New owner mandate** |
|-------|---------------------------|------------------------|
| TikTok / Facebook **login** | Listed as OAuth sign-in providers | **Remove from login.** Not auth providers. |
| TikTok / Facebook **Live** | “Do not fake Live until approved APIs” | Become **streaming integrations** (connect external accounts, read chat, co-host). Same for YouTube, Twitch, Kick, Instagram Live where possible. |
| Login that stays | Google, Apple, Facebook, TikTok, email | **Email, Google, Apple** (+ secure phone/OTP as already designed). |
| Aura | Heart of product, memory, co-host | Must be **intelligent autonomous assistant**, not chatbot — memory, habits, personality, live co-host across ecosystem. |
| Design bar | Match FINAL boards | If anything feels generic/empty — **redesign**. Do not ship “good enough.” |

**Implication:** Auth screens, `PUBLIC_OAUTH_PROVIDERS`, test-stand synthetic FB/TikTok login, and stand-status `facebook_login` / TikTok login features must be rebuilt. Live adapters stay (and must grow) as **integrations**, not IdPs.

---

## 2. Vision vs reality (scorecard)

| Pillar | Vision | Reality today | Grade |
|--------|--------|---------------|-------|
| **Aura AI** | Autonomous co-host; long-term memory; habits; emotion; human speech; live chat; moderation; scenes; one brain across SYLORA | Chat + SSE + memory CRUD + keyword “emotion” + hardcoded tips; DialogueScheduler exists but TikTok chat blocked; tools tiny (`draft_post`, mark notification); no habit model; no continuous learning loop | **FAIL → PARTIAL** |
| **Auth** | Secure, premium onboarding → Meet Aura | Email works; Google/Apple if keys; FB/TikTok still offered (incl. synthetic stand); mobile social pending; FINAL-14 onboarding incomplete | **FAIL vs new mandate** · **PARTIAL vs old docs** |
| **Streaming integrations** | Connect TikTok/YT/Twitch/Kick/FB/IG Live; AI reads chat & co-hosts | MediaMTX native LIVE works on stand; YT/Twitch/Discord adapters PARTIAL; TikTok/FB/Kick/IG **BLOCKED/unavailable**; OBS PARTIAL; no true co-host UX | **PARTIAL (native)** · **FAIL (external LIVE)** |
| **Design / living UI** | FINAL champagne-glass OS; motion; glass; unique identity | Tokens + landing improved; ~0 FINAL index PASS; ~50+ Material dialogs; hardcoded English walls; Creator Studio ops-like; Calls Suite MISSING; Music cinema MISSING | **FAIL product-wide** · landing **PARTIAL** |
| **Gifts / Messages / Music locks** | Contextual gifts; Calls hub; first-class music | Gift shop exists; send path partial; Messages ≠ Calls Suite; Music English mini-player | **PARTIAL** |
| **World-class polish** | Instantly recognizable SYLORA | Still readable as “Flutter app + pretty landing” | **FAIL** |

Stand-status (live): TikTok/Facebook/Instagram platforms **BLOCKED**; wallet sandbox; gift library PARTIAL; payments unconfigured.

---

## 3. Brutal detail by domain

### 3.1 Aura — “intelligent autonomous assistant”

**What exists**
- OpenAI chat + SSE streaming deltas
- Memory endpoints + vector grounding
- Presence endpoint (mood label)
- Live DialogueScheduler / CoHostMemory hooks in API
- Flutter Aura presence orb + tips
- Landing Aura with CSS emotion/gaze/blink (cosmetic life)

**What is missing for the vision**
- **Proactive agent loop** (observe → plan → act across Live/Studio/Business/Edu)
- **Long-term habit & preference model** (not just memory notes)
- **Real affective system** (model-driven emotion → voice/face/behavior), not keyword heuristics
- **Human speech pipeline** always-on (Whisper STT + TTS + lip/face sync) — fail-closed without keys today
- **Live co-host product UX**: read chat, speak to viewers, ask questions, moderate, translate, scene control
- **One personality across every surface** with persistent context (desktop companion rail FINAL-19 still weak)
- Continuous improvement / evaluation harness for “sounds human”

**Honest label:** Premium-skinned **chatbot + memory**, with stubs toward co-host — **not** yet an autonomous assistant.

### 3.2 Authentication (redesign required)

**Current**
- Email/password, email OTP, phone OTP
- OAuth: Google, Apple, Facebook, TikTok (+ GitHub dev)
- Test-stand synthetic Facebook/TikTok login
- FINAL-14 (interests → music → Meet Aura → permissions) incomplete

**Required by new mandate**
1. Remove Facebook & TikTok from login UI and `auth/methods`
2. Keep Email (+ OTP), Google, Apple
3. Reposition TikTok/Facebook exclusively under **Live → Destinations / Integrations**
4. Rebuild onboarding to FINAL-14 with Meet Aura as a first-class beat
5. Mobile OAuth must work, not web-only placeholders

### 3.3 Streaming integrations (not login)

**Current adapter reality** (`IntegrationPlatform`)
| Platform | Status |
|----------|--------|
| SYLORA native (MediaMTX WHIP/HLS) | Working on stand |
| OBS | PARTIAL |
| YouTube / Twitch / Discord | PARTIAL adapters |
| TikTok LIVE | BLOCKED_BY_PROVIDER_ACCESS |
| Facebook / Kick / Instagram | Unavailable / requires provider review |

**Vision gap**
- Modular “connect account → authorize chat → AI co-host” product flow is incomplete
- No unified Live Integration Center UI matching FINAL director boards
- AI cannot yet prove “talks to viewers on TikTok Live” without official access — must remain honest (no fake events)

### 3.4 Design — still below FINAL / premium bar

From `DESIGN_VERIFICATION.md` (still **NOT APPROVED**):
- ~0 screens **PASS** on FINAL index
- Calls Suite (1:1 voice/video, group voice) **MISSING**
- Music cinema expand **MISSING**
- Onboarding Meet Aura **MISSING**
- Gift particle cinema incomplete
- Creator Studio reads as admin checklist, not glass director
- ~50–100 Material dialogs / generic empties
- Hardcoded English dense in marketplace, platform, creator, admin, music
- Motion system (FINAL-16) not product-wide

Landing was improved (living Aura + UK/EN) — still not enough to carry the whole product.

### 3.5 Structural debt that hurts quality

- Duplicate Vite `src/` design gallery vs Flutter product
- Dual live paths (`live_adapters` vs stub `live_platforms` packages)
- Skipped foundation widget tests
- Owner Services panel frozen (correct) but surrounding chrome still inconsistent
- Overnight go-live work optimized for **demoability**, not FINAL fidelity

---

## 4. What is actually good (keep)

1. **Honest test-stand / diagnostics** — does not fake TikTok Live proof  
2. **MediaMTX native go-live path** on getsylora.com (WHIP + HLS watch)  
3. **Champagne token foundation** + recent living landing  
4. **Architecture locks** (gifts contextual, Messages = calls hub, MediaMTX stack) still correct  
5. **API surface** for AI memory/stream and live sessions is a usable backbone  

These are foundations — not the finished product.

---

## 5. Recommended implementation order (after this gate)

Do **not** parallel-spray features. Waves must be vision-locked.

### Wave R0 — Auth identity reset (owner override)
- Strip TikTok/Facebook from login (API + Flutter + stand-status)
- Keep Email / Google / Apple
- Docs: update OWNER_SERVICES to match override
- Clear synthetic FB/TikTok IdP paths

### Wave R1 — Aura as autonomous core (product heart)
- Presence Fabric: persistent companion + emotion from model signals  
- Habit/preference memory schema + retrieval policy  
- Expand tool/agent loop (Live, Studio, moderation, translation, scenes) with approval gates  
- Voice in/out path when keys present; graceful human copy when not  
- Kill keyword tips as the “personality”

### Wave R2 — Live Integration Center
- UI: connect YT/Twitch/TikTok/FB/Kick/IG as **destinations**, never login  
- Chat ingress → Aura co-host actions (reply, ask, moderate, translate)  
- OBS + native MediaMTX remain first-class publish path  
- Stay fail-closed / PARTIAL until real provider access

### Wave R3 — Design PASS campaign (FINAL boards)
- Migrate Material dialogs → Sylora glass system  
- Calls Suite screens (Messages hub)  
- Music cinema player  
- FINAL-14 onboarding + Meet Aura  
- Desktop Aura rail + Moments  
- Motion language product-wide  
- Harvest English walls into l10n  

### Wave R4 — Premium proof
- Gift cinema + payments (when Stripe live)  
- Delete or quarantine non-canon Vite gallery from “product” mental model  
- Re-enable skipped foundation tests  
- Design verification matrix → all PASS before claiming vision complete  

---

## 6. Explicit non-claims

Until Waves R0–R3 land, **do not claim**:
- “Aura is a living autonomous co-host”
- “SYLORA matches approved FINAL design”
- “TikTok/Facebook Live co-host works”
- “World-class / ready for mass friends demo beyond native Live”

Claim only what stand-status and DESIGN_VERIFICATION allow.

---

## 7. Self-indictment (agents)

Recent agent work over-indexed on **deployable go-live** and under-indexed on **FINAL fidelity + Aura autonomy + auth purity**. That was useful for a stream demo; it is **insufficient** for the approved vision and for the new owner bar. This document is the corrective gate.

**Next action:** Start Wave **R0 (auth identity reset)** unless the owner reorders priorities.
