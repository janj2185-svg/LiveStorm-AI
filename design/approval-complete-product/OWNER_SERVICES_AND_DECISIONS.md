# SYLORA — Owner purchase checklist + major decisions

Prepare these **before or right after** design approval so implementation is not blocked on secrets.

## A. What you must purchase / configure (production)

Give keys in a secure channel (not chat if possible). Leave blank only if you explicitly defer that capability.

| Service | Why | What to buy / create | Approx. cost class |
|---------|-----|----------------------|--------------------|
| **OpenAI API** | Aura chat, memory embeddings, TTS voice, moderation, translation assist | Paid OpenAI account + `OPENAI_API_KEY` (usage limits) | Pay-as-you-go |
| **SMTP email** | Verify, reset, OTP, receipts | Resend / Postmark / Amazon SES + domain DNS | Low monthly |
| **Stripe** | Wallet top-up, payouts, marketplace | Stripe account + secret + webhook + publishable key | Fees % |
| **Cloudflare R2** (or S3) | Media, recordings, avatars | R2 bucket + access keys (prod path already designed) | Low storage |
| **Firebase Cloud Messaging** | Push on Android/iOS/Web | Firebase project + service account JSON | Free tier then scale |
| **OAuth: Google** | Sign-in | Google Cloud OAuth client (Web + iOS + Android) | Free |
| **OAuth: Apple** | Sign-in (iOS/macOS required for store) | Apple Developer + Services ID | Apple Developer $99/yr |
| **OAuth: Facebook** | Sign-in | Meta app + Facebook Login | Free |
| **OAuth: TikTok** | Sign-in | TikTok Login Kit app | Free |
| **Domain + TLS** | getsylora.com (already live) | Keep DNS + certs current | Existing |
| **TURN / MediaMTX host** | WebRTC calls + live | Adequate VPS/bandwidth; TURN secret | Existing Hetzner + scale as needed |
| **Sentry** (recommended) | Error reporting | Sentry project + DSN | Free→Team |
| **SMS (optional)** | Phone auth | Twilio or Vonage | Pay-as-you-go |

**Already scaffolded in repo (need keys to go live):** OpenAI, Stripe, SMTP, FCM, OAuth providers, MediaMTX/TURN, R2/S3 recordings, Prometheus/Grafana.

**Not “fake Live” on TikTok/Kick/Facebook** until those platforms approve official Live APIs — SYLORA-native live + OBS remains the production path.

## B. Major architectural decisions — APPROVE or CHANGE before coding

Reply with yes/no (or alternatives) for each:

### B1. Client stack (recommended: YES)
**Flutter single codebase** for Android, iOS, Web, Windows, macOS, Linux — shared UI/business logic; platform channels only where native (virtual cam, OBS companion, push, StoreKit/Play Billing later).

### B2. Realtime media (recommended: YES)
Keep **MediaMTX + WHIP/WebRTC + coturn** for live publish/play and calls/conferences. OBS Companion for desktop creators. Do **not** replace with a paid SFU (LiveKit/Agora) unless scale requires it later.

### B3. Aura AI brain (recommended: YES)
**OpenAI** as primary LLM + embeddings + TTS. Memory stored in SYLORA DB + vector embeddings. Emotions/avatar: SYLORA-owned expression layer driven by model signals (not a separate “chatbot skin”). Fallback: any OpenAI-compatible endpoint later.

### B4. Speech (recommended: YES)
- **STT:** OpenAI Whisper API (or gpt-4o-transcribe) for voice control + call captions.  
- **TTS:** OpenAI TTS for Aura voice.  
Alternative (ask if preferred): Deepgram STT + ElevenLabs TTS (extra vendors).

### B5. Payments (recommended: YES)
**Stripe** for wallet top-up and creator payouts. Native IAP (Apple/Google) only when shipping store builds that sell digital goods — present as a follow-up decision when mobile store release starts.

### B6. Music rights (recommended: YES — phased)
Phase 1: **royalty-free / creator-owned / AI-generated** catalog under SYLORA license + user uploads with rights attestation.  
Phase 2 (major): commercial label catalog (requires separate deals) — **do not start without owner approval**.

### B7. Error monitoring (recommended: YES)
**Sentry** for API + Flutter clients.

### B8. Backups (recommended: YES)
Automated **Postgres + object storage** backups (daily + retention) on production host/R2; documented restore drill.

## C. Vision-aligned improvements (will implement after design approval unless you veto)

1. **Aura Presence Layer** — persistent companion on desktop; contextual orb on mobile; emotion + voice without blocking UX.  
2. **Unified Media Session** — one session model for Live, Calls, Conference, Voice Rooms (gifts/hooks/AI attach to session type).  
3. **Creator Go-Live Checklist** — cam/mic/route/OBS/virtual cam/record/BGM must be green before On Air.  
4. **Call AI Translation** — live captions bilingual during calls (Whisper + translate).  
5. **Accessibility** — reduce-motion, focus order, contrast, screen-reader labels on all primary flows.  
6. **Moderation Copilot** — Aura-assisted queue for live chat + reports (human final action).  
7. **Performance budget** — 60fps targets on mid devices; effects gated by reduce-motion and GPU tier.

## D. Explicit approval phrases

**Design:** `APPROVE ALL` / `APPROVE WITH CHANGES: …` / `REJECT: …`  
**Architecture block B:** `APPROVE ARCHITECTURE B1–B8` or list changes.

Implementation starts only after design approval. Architecture B defaults can be confirmed in the same message.
