# SYLORA — Production Quality Gate (Stop Feature Work)

**Date:** 2026-08-05  
**Live:** https://getsylora.com  
**Verdict:** **NOT WORLD-CLASS. Feature freeze remains until this gate passes.**

This document merges the brutal self-review, browser QA audit, and owner mandate. It is the source of truth for what must be fixed before new modules ship.

---

## 0. Honest self-verdict

| Claim we might make | Truth |
|---------------------|--------|
| “Aura is a living companion” | **False.** She is a chat surface + PNG/CSS emotion + an always-on tip card that blocks UI. |
| “Landing creates WOW” | **Partial.** Champagne particles are pretty; the page is still a short hero, not a next-gen ecosystem. |
| “Live is the heart” | **Partial.** Native MediaMTX go-live works. TikTok LIVE co-host is **blocked by provider access** — do not fake it. |
| “Ukrainian is complete” | **False.** Landing UK → app EN; Live/Studio/Market still leak English. |
| “Design matches FINAL boards” | **False.** ~0 FINAL screens PASS; Material dialogs leak; empties feel generic. |

**One sentence:** Capable prototype with a beautiful skin — not yet a premium AI OS people would call the future.

---

## 1. Gate checklist (must all be green)

### P0 — Ship blockers
- [ ] Auth never hangs on “Запуск SYLORA…” (landing → Flutter handoff)
- [ ] Friends / social usable without a dead-end “Public handle required”
- [ ] Aura **hidden by default**; summon only; companion only in conversation
- [ ] Login offers **Email / Google / Apple** only (no TikTok/Facebook IdP)
- [ ] Landing language persists into the Flutter app
- [ ] When locale is `uk`, critical shells (nav, Live, Aura, Home, More, Auth) show **no English leftovers**

### P1 — Vision bar
- [ ] Landing: cinematic hero + Live / Creator / Business / Education / Ecosystem chapters with premium motion
- [ ] One visual language across Home → Live → Aura → Studio → More (no Material dialogs on primary paths)
- [ ] Live Integration Center presents destinations honestly (native ready; TikTok blocked until approval)
- [ ] Aura companion mode: breath, gaze, blink, emotion tied to chat state; dismissible
- [ ] Motion on primary interactions (enter, nav, CTAs, empty → action)

### P2 — Proof before “continue development”
- [ ] Manual pass of every primary tab at phone / tablet / desktop
- [ ] Screenshot pack + gate signed in this file
- [ ] Deployed to getsylora.com and re-audited

---

## 2. Aura — technology options (for owner decision)

In-house PNG + Flutter/CSS motion **cannot** reach photoreal “living human” quality. Options:

| Option | Realism | Latency | Cost | Notes |
|--------|---------|---------|------|-------|
| **A. In-house (current path)** | Low–med | Low | Low | Emotion/gaze/breath; good for brand orb; not a face actor |
| **B. Live2D / VTube Studio style** | Med | Low | Med | Expressive 2D; needs art pipeline |
| **C. Ready Player Me + Talk** | Med | Med | Med | Avatar + lip sync; still “avatar” |
| **D. D-ID / HeyGen streaming avatar** | High | Med–high | High | Photoreal talking head; API keys + egress; privacy review |
| **E. Unreal / MetaHuman (later)** | Highest | High | Very high | Wrong for v1 mobile web |

**Recommendation for this wave:** Ship **A + summon UX** (hidden/default, companion in chat) immediately. Present **D** as the upgrade path for photoreal co-host once Live TikTok access exists. Do not pretend A is D.

---

## 3. Live / TikTok honesty

- Native WHIP/HLS on stand: **working**
- TikTok / Facebook / Instagram Live adapters: **BLOCKED_BY_PROVIDER_ACCESS**
- Product rule: show Integration Center with clear status; never fabricate chat/gifts/follows

Co-host product target (when unblocked): read chat → answer → ask → react to gifts/follows/likes → translate → human co-host behavior.

---

## 4. Design consistency rule

Every authenticated surface uses Sylora tokens + glass + living canvas.  
`AlertDialog` / Material snackbars on primary journeys = **fail**. Use `showSyloraDialog`.

---

## 5. This wave’s implementation scope

1. Quality gate doc (this file)  
2. Aura hidden / summon / companion  
3. Auth login strip TikTok & Facebook  
4. Landing cinematic + ecosystem chapters  
5. Locale bridge landing → Flutter  
6. Stand auto public-handle so Friends works  
7. Critical UK strings for Live/Aura tips  
8. Deploy + verify  

**Still NOT claimed after this wave:** photoreal Aura, TikTok LIVE co-host proof, full FINAL board PASS, 100% UK string coverage of marketplace/admin.

---

## 6. Sign-off

| Role | Status |
|------|--------|
| Product / Design | **HOLD** — not world-class |
| Engineering | Implementing quality wave |
| Owner | Required before feature resume |
