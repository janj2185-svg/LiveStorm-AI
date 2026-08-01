# Credentials & Approvals Checklist

Fill these before a real friend-test / production launch.  
**Nothing below is simulated as “working” until you supply it.**

---

## Required for local friend testing (minimum)

| Item | Where to get | Env var | Status |
|---|---|---|---|
| Clerk publishable key | https://dashboard.clerk.com → API Keys | `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` | ⬜ You must supply |
| Clerk secret key | same | `CLERK_SECRET_KEY` | ⬜ You must supply |
| OpenAI API key | https://platform.openai.com/api-keys | `AI_INTEGRATIONS_OPENAI_API_KEY`, `OPENAI_API_KEY` | ⬜ You must supply (paid usage) |
| PostgreSQL | local or hosted | `DATABASE_URL` | ✅ Local recipe in startup guide |
| Owner email | your login email | `OWNER_EMAIL` | ⬜ Set to your real Clerk email for admin bypass |

---

## Required for real TikTok LIVE

| Item | Where to get | Env var | Notes |
|---|---|---|---|
| TikTok LIVE provider | https://tik.tools (recommended) or Eulerstream | `LIVE_PROVIDER`, `TIKTOOL_API_KEY` | Personal key — demo/community keys hit session limits |
| Mode | — | `TIKTOK_MODE=real` | Account must be **LIVE** during test |
| Optional signing API | Replit-specific / custom | `SIGN_API_KEY`, `SIGN_API_URL` | Only if using object signing |

**Official TikTok API note:** TikTok does not provide a public official LIVE chat websocket for third-party co-hosts. This product uses third-party LIVE connectors (tik.tools / Eulerstream / tiktok-live-connector). Using them may violate TikTok ToS — your legal acceptance required.

---

## Optional paid / approval-gated integrations

| Integration | What you need | Env / config | Status in code |
|---|---|---|---|
| **YouTube Live chat** | Google Cloud OAuth client + YouTube Data API enabled | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Partial — OAuth + poller exist; registry still marks coming_soon |
| **Stripe billing** | Stripe account + webhook | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` | Implemented; optional |
| **Twitch** | Twitch developer app + EventSub | — | ❌ Stub only |
| **Kick** | Kick developer access | — | ❌ Stub only |
| **Discord** | Bot token + OAuth | — | ❌ Not implemented |
| **Telegram** | BotFather token | — | ❌ Not implemented |
| **Facebook / Instagram LIVE** | Meta app review | — | ❌ Not implemented |
| **OBS** | Local OBS Studio | Browser Source URLs from app | ✅ Works without external API keys |
| **Ready Player Me / Avaturn** | Their creator URLs / accounts | Frontend URLs | ✅ Client SDKs wired |
| **Object storage (prod)** | GCS / MinIO / Replit storage | `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` | Replit-oriented; VPS uses filesystem paths |

---

## Animated Gift Store / Wallet / Marketplace

| Item | Status | Needs your approval |
|---|---|---|
| First-party Gift Gallery / Store / Wallet | ❌ Not in codebase | See `docs/GIFTS_AAA_PIPELINE_PLAN.md` |
| AAA 3D gift assets (Blender / Unreal / Houdini / studio) | ❌ Concept PNGs only | Paid production pipeline — **requires your approval** |
| Payment for gift packs | ❌ | Stripe products + compliance |

---

## Flutter / Mobile / Redis / WebRTC / RTMP

| Item | Status | Needs |
|---|---|---|
| Flutter / Android / iOS apps | ❌ Not in repo | New project approval |
| Redis | ❌ Not used | Optional for multi-node rate limits / queues |
| WebRTC / RTMP ingest | Design stubs only | Mediasoup/SRS/FFmpeg stack + hosting |

---

## Manual confirmation checklist (reply with ✅)

1. [ ] I will provide Clerk keys  
2. [ ] I will provide OpenAI keys and accept usage cost  
3. [ ] I want `TIKTOK_MODE=demo` for friends tomorrow **or** real LIVE with tik.tools key  
4. [ ] I approve / reject the AAA gift pipeline plan  
5. [ ] I approve / reject building Flutter + Marketplace + Wallet as new modules  
6. [ ] Owner email for admin: `________________@________`  
