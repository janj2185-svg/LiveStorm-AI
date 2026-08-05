# QA Audit — SYLORA daily-use (2026-08-05)

Founder tested as a normal user. Screens that open ≠ ready. Only E2E flows count.

## WORKS end-to-end
- Email register / login (JWT)
- Feed browse + create/publish post
- Like on **posts**
- Add comments
- AI consent gate
- Live: create session, preflight, MediaMTX credentials API
- Wallet sandbox balance
- DMs list (empty but loads)

## PARTIAL
- Live “Start” on Live tab → marks `live` **without camera publish**
- Creator Studio WHIP publish (web only; empty ICE servers)
- Live viewer = copy watch link only (no in-app player)
- Wallet top-up (payments sandbox / Stripe unset)
- Google/Apple login (UI ready, OAuth secrets BLOCKED)

## BROKEN
- **Aura text replies** via streaming — OpenAI usage chunk `choices:[]` → `IndexError` → `provider_invalid_chat_stream` (non-stream `/send` works)
- **Aura voice reply** — chat stream broken + TTS jobs stuck `queued`
- Mic STT on non-web = unsupported (often looks live)

## FAKE / decoy
- Comment likes — **API works, Flutter has no button**; comment schema omits reaction fields
- Live Native Ready / TikTok chips with `onTap: () {}`
- TikTok LIVE controls (honestly blocked, but still look like product)

## Fix order (no new features until these pass)
1. Aura `stream_chat` empty-choices crash + client SSE→non-stream fallback
2. Comment like UI + CommentResponse reaction fields
3. Live Start must publish WHIP or force Studio; never “live” with no media
4. Disable/remove dead platform chips; honest disabled reasons
5. Voice: honest unavailable OR wire TTS worker
6. In-app Live viewer (HLS) + ICE servers
