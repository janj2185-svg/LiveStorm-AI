# Keys needed to unlock 100% SYLORA

You gave full freedom. Code can go far without secrets — but these keys unlock what code alone cannot fake honestly.

## Priority 1 — must have for world-class entry + money

| Secret | Env vars | Unlocks |
|--------|----------|---------|
| **Google OAuth** | `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET` | Sign in with Google |
| **Apple OAuth** | `OAUTH_APPLE_CLIENT_ID`, `OAUTH_APPLE_CLIENT_SECRET` (+ team/key/private key for native) | Sign in with Apple |
| **Stripe** (test mode OK) | `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Wallet top-up, marketplace checkout, gift economy |

## Priority 2 — Live destinations (multi-platform streaming)

| Secret | Env vars | Unlocks |
|--------|----------|---------|
| **YouTube** | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` | Stream destination + chat ingress |
| **Twitch** | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REDIRECT_URI` | Stream destination + chat |
| **Discord** | `DISCORD_APPLICATION_ID` (+ bot token if available) | Community / destination |

## Priority 3 — optional polish

| Secret | Env vars | Unlocks |
|--------|----------|---------|
| **TTS/STT** | `TTS_*`, `STT_*` | Spoken Aura replies / mic transcription |
| **FCM push** | `FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_JSON` | Mobile push |
| **TikTok LIVE** | Only if you have **approved** vendor access | Official TikTok LIVE (cannot be faked) |

## Already on the stand

- `OPENAI_API_KEY` — Aura chat works
- SMTP — email auth / reset works
- MediaMTX, S3, Redis, Postgres — Live plane works

## How to give keys

Paste into a private message, or put them in the stand Owner Admin → Services, or reply here with values.  
I will inject into `/root/Sylora-restored/infrastructure/production/.env`, recreate API, verify, and never commit secrets to git.

## What I am building now without waiting

1. Richer seeded world (creators, posts, courses, products, workspace)
2. Aura → real live co-host tools + warmer conversation
3. Native Live one-path (preflight → WHIP → start → watch)
4. Premium empty→working flows for Business / Learn / Music / Market
5. Messages hub + call entry
6. Full UK + craft on core surfaces
