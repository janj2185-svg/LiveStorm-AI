# SYLORA / LiveStorm — Production Release Status

Generated: 2026-08-01  
Repo: LiveStorm-AI (product branding: SYLORA / LiveStorm AI)

This document is the honest release matrix. Nothing here is marked complete without a real test or code evidence.

---

## How to launch locally (friend testing)

```bash
# 1) Dependencies
pnpm install

# 2) PostgreSQL (local)
sudo service postgresql start
# DB user/pass/db used by .env.local:
#   postgresql://livestorm:livestorm_dev@127.0.0.1:5432/livestorm

# 3) Env
cp .env.local.example .env.local   # or use committed template docs
# Fill OpenAI keys for AI voice/chat (optional for UI-only)

# 4) Start
chmod +x scripts/start-local.sh
./scripts/start-local.sh
```

Or manually:

```bash
set -a && source .env.local && set +a
pnpm --filter @workspace/api-server run build
PORT=8080 pnpm --filter @workspace/api-server run start
# other terminal:
PORT=23121 BASE_PATH=/ VITE_LOCAL_DEV_AUTH=1 \
  VITE_CLERK_PUBLISHABLE_KEY=pk_test_local_dev_bypass \
  pnpm --filter @workspace/livestorm-ai run dev
```

Open: **http://localhost:23121/dashboard**

Local auth auto-logs in as owner (`dev_owner_clerk` / `kvasnytcya21@gmail.com`) via `/api/dev/login`.

### Docker

```bash
cp .env.production.example .env
# fill secrets
docker compose up -d --build
```

Requires built frontend at `artifacts/livestorm-ai/dist/public` and real Clerk + OpenAI keys.

---

## Test accounts (local DB)

| Role | Email | Clerk ID (dev) | Streamer ID | Plan |
|---|---|---|---|---|
| Owner / Admin | kvasnytcya21@gmail.com | `dev_owner_clerk` | 4 | studio |
| Admin | admin@sylora.local | `dev_admin_clerk` | 5 | studio |
| Demo streamer | demo@sylora.local | `dev_demo_clerk` | 6 | creator |
| Legacy demo | demo@livestorm.local | `demo_clerk_hello` | 1 | pro |

Password: **none** in local mode — cookie auth only. Production uses Clerk.

---

## Environment variables

See `.env.example`, `.env.production.example`, and `.env.local`.

### Required for real production

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` / `VITE_CLERK_PUBLISHABLE_KEY` | Auth |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | GPT chat / co-host |
| `OPENAI_API_KEY` | TTS (and Whisper fallback) |
| `TIKTOK_MODE=real` + `TIKTOOL_API_KEY` | Real TikTok LIVE |
| `FRONTEND_URL` | CORS / redirects |

### Optional / gated

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID/SECRET` + `YOUTUBE_REDIRECT_URI` | YouTube Live |
| `STRIPE_*` | SaaS billing |
| `SIGN_API_KEY` | Eulerstream signing |
| `LOCAL_DEV_AUTH=1` / `VITE_LOCAL_DEV_AUTH=1` | Local cookie auth bypass |

### Not in this codebase

- **Redis** — not used (no Redis client). Ignore Redis claims.
- **Flutter / Android native apps** — not in repo (web + Electron desktop only).
- **RTMP ingest server** — not present; streaming is via TikTok/YouTube connectors + OBS browser sources.
- **WebRTC SFU** — not present as a first-class module.

---

## Module status

### Fully working (tested or code-verified this release)

| Module | Evidence |
|---|---|
| API health | `GET /api/health` → 200 |
| Local auth bypass | `GET /api/dev/login` → owner cookie |
| Users/me | Returns owner profile |
| Demo TikTok session start | `POST /sessions/start` mode=demo |
| Gift inject + received feed | `/api/gifts/received` after inject |
| Gift reference catalog | `/api/gifts/catalog` |
| Gift nav page `/gifts` | Wired in App + Layout |
| Multilingual allowlist ES/FR/IT/PT | `VALID_LANGUAGES` + UI options |
| Emotion HTTP auth | Uses `req.clerkUserId` |
| Gift `repeatEnd` combo filter | Connector + ingest + gamification + orchestrator |
| YouTube registry honesty | stage=`beta`, available |
| OpenAI lazy boot | Server starts without keys |
| OBS overlays routes | Existing pages under `/obs/*` |
| Electron desktop package | `artifacts/desktop` (build scripts present) |

### Partially working

| Module | Gap |
|---|---|
| AI co-host voice | Needs `OPENAI_API_KEY` + browser unlock |
| AI chat replies | Needs `AI_INTEGRATIONS_OPENAI_API_KEY` |
| Mic / Whisper | Needs OpenAI + browser mic permission |
| Real TikTok | Needs `TIKTOOL_API_KEY` + live username |
| YouTube Live | Code exists; needs Google OAuth secrets + user consent |
| Stripe billing | Needs Stripe keys + webhook |
| Alliance gameplay | CRUD only, no mechanical benefit |
| Analytics | Empty until enough sessions |
| AAA gift animations | CSS preview only — see `docs/GIFT_AAA_PIPELINE.md` |

### Not present / not working (do not claim)

| Claim | Reality |
|---|---|
| Flutter mobile | No Flutter project |
| Android app | No Android project |
| Redis | Not in stack |
| Marketplace / wallet store | Not implemented |
| Business CRM | Not implemented |
| Education LMS | Not implemented |
| Twitch / Kick connectors | Registry stubs only |
| Facebook / Instagram / Discord / Telegram | No code |
| Native RTMP/WebRTC platform streaming | Not built |
| Purchasable animated gifts | Pending your approval |

---

## Platform integrations checklist (your credentials)

| Platform | Status | You must provide |
|---|---|---|
| TikTok LIVE | Demo works; real needs key | Personal tik.tools API key; live `@username` |
| YouTube Live | Beta code ready | Google Cloud OAuth client + redirect URI |
| Twitch | Stub | Full build + Twitch app credentials |
| Kick | Stub | Full build + Kick credentials |
| Facebook / Instagram | Absent | Meta app review + APIs |
| Discord | Absent | Bot token + intents |
| Telegram | Absent | Bot token |
| OBS | Overlays work | OBS Studio + browser sources (no OBS WebSocket remote control) |
| OpenAI | Required for AI | API key with GPT + TTS (+ Whisper) |
| Clerk | Required for prod auth | Publishable + secret keys |
| Stripe | Optional billing | Secret + webhook secret |

---

## Security fixes / notes this release

- Emotion route auth field corrected (`clerkUserId`)
- Local auth path no longer crashes when Clerk middleware is skipped
- Gift combo inflation mitigated via `repeatEnd`
- Empty-room `ai:announcement` skipped (reduces wasted TTS client calls)
- OpenAI no longer hard-crashes process on missing key at import
- Secrets must stay in `.env` (gitignored); examples only in repo

Still required for production hardening: real Clerk, rate limits review, WAF/nginx TLS, Stripe webhook verification, and dependency audit before public launch.

---

## What needs your approval

1. **AAA Gift pipeline** — choose option in `docs/GIFT_AAA_PIPELINE.md`
2. **Paid services**: OpenAI, tik.tools plan, Stripe, Google Cloud, CDN
3. **Platform developer accounts** for Twitch/Kick/Meta/Discord/Telegram if those are in scope
4. **Clerk production instance** for friend accounts beyond local bypass

---

## Evidence folder

Screenshots / recordings from this release pass will be stored under `artifacts/` release demo paths when captured.
