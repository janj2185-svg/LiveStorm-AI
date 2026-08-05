# QA Audit — SYLORA daily-use (2026-08-05)

Founder tested as a normal user. Screens that open ≠ ready. Only E2E flows count.

## WORKS end-to-end (verified after P0 fixes)
- Email register / login (JWT)
- Feed browse + create/publish post
- Like on **posts**
- Like on **comments** (UI + API `reaction_count` / `viewer_reaction`)
- Add comments
- AI consent gate
- **Aura text chat** (stream fixed + non-stream fallback) — probed `OK` + `completed`
- **Aura TTS voice jobs** (Celery worker now running) — job reaches `succeeded`
- Live: create session, preflight, MediaMTX credentials API
- Wallet sandbox balance
- DMs list (empty but loads)

## PARTIAL
- Live go-live: Start on Live tab now **routes to Creator Studio** (honest); WHIP publish still web/Studio-only
- Live viewer = copy watch link only (no in-app player yet)
- Wallet top-up (payments sandbox / Stripe unset)
- Google/Apple login (UI ready, OAuth secrets BLOCKED)
- Mic STT: web-only path; depends on browser capture

## BROKEN / remaining
- Live in-app HLS/WHEP player
- ICE servers empty (`TURN_URLS`) — WHIP may fail for some networks
- Real payments / Stripe

## FAKE removed
- Live Native/TikTok chips with empty `onTap` → non-interactive status chips

## Fix log
1. ✅ Aura `stream_chat` empty-choices crash
2. ✅ SSE → `/send` fallback
3. ✅ Comment likes UI + schema
4. ✅ Dead platform chips
5. ✅ Live Start honesty → Creator Studio
6. ✅ Celery worker for TTS/voice jobs
7. ⏳ In-app Live viewer + TURN
8. ⏳ Stripe / OAuth keys from owner
