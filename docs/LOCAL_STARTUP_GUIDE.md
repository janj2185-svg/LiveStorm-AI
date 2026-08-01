# SYLORA / LiveStorm AI — Local Startup Guide

**Goal:** launch the platform on your machine so you and friends can test tomorrow.

This repository is **LiveStorm AI** (TikTok LIVE AI co-host + gamification).  
“SYLORA” branding for marketplace / wallet / Flutter apps is **not present** in this codebase yet — see `docs/PRODUCTION_RELEASE_STATUS.md`.

---

## 1. Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ (22 recommended) |
| pnpm | 9+ (`corepack enable && corepack prepare pnpm@9.15.0 --activate`) |
| PostgreSQL | 16 |
| Clerk account | Required for the web UI login |
| OpenAI API key | Required for AI replies + TTS |
| Docker | Optional (compose file included; Docker not required for local pnpm run) |

---

## 2. One-time database setup

```bash
# Start Postgres (Linux example)
sudo service postgresql start

# Create role + DB (once)
sudo -u postgres psql -c "CREATE USER livestorm WITH PASSWORD 'livestorm_dev' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE livestormdb OWNER livestorm;"

# Apply schema
PGPASSWORD=livestorm_dev psql -h 127.0.0.1 -U livestorm -d livestormdb -f DATABASE_SCHEMA.sql
```

---

## 3. Environment file

```bash
cp .env.local.example .env
# Edit .env and fill Clerk + OpenAI keys (see CREDENTIALS_CHECKLIST.md)
```

Minimum for local demo:

```env
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://livestorm:livestorm_dev@127.0.0.1:5432/livestormdb
TIKTOK_MODE=demo
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OWNER_EMAIL=your-real-email@example.com
FRONTEND_URL=http://localhost:5173
```

---

## 4. Install + seed

```bash
pnpm install
pnpm --filter @workspace/db exec tsc --build tsconfig.json
pnpm --filter @workspace/api-server exec tsx src/scripts/seed-demo-users.ts
```

Seeded accounts (DB rows — UI login still goes through Clerk):

| Role | Email | Clerk ID (dev cookie) |
|---|---|---|
| Admin / owner | `OWNER_EMAIL` or `owner@sylora.local` | `demo_admin_clerk` |
| Streamer | `streamer@sylora.local` | `demo_streamer_clerk` |
| Friend | `friend@sylora.local` | `demo_friend_clerk` |

API-only auth cookie (non-production):

```bash
curl -c cookies.txt "http://localhost:8080/api/dev/login?clerkId=demo_streamer_clerk"
curl -b cookies.txt http://localhost:8080/api/users/me
```

---

## 5. Run (two terminals)

```bash
# Terminal A — API
set -a; source .env; set +a
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal B — Web UI
set -a; source .env; set +a
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/livestorm-ai run dev
```

Or use the helper:

```bash
chmod +x scripts/start-local.sh
./scripts/start-local.sh
```

- API health: `http://localhost:8080/api/health`
- Web UI: `http://localhost:5173` (or the Vite port printed in the terminal)

---

## 6. Friend-test flow (demo TikTok)

1. Sign in with Clerk (create accounts for you + friends).
2. Settings → set TikTok username (any handle; demo mode does not need a real LIVE).
3. Open **AI Co-Host** → enable Auto-reply + OpenAI voice.
4. Click **Go Live** — simulator starts generating comments / gifts / likes / follows.
5. Confirm AI replies appear and TTS plays after “Enable Voice Output”.
6. Open OBS overlays from the Overlays page and paste into OBS Browser Source.

Real TikTok: set `TIKTOK_MODE=real`, `LIVE_PROVIDER=tiktools`, and a personal `TIKTOOL_API_KEY`. Account must be LIVE.

---

## 7. Docker (optional)

```bash
cp .env.production.example .env
# fill secrets
pnpm --filter @workspace/livestorm-ai run build   # nginx mounts dist/public
docker compose up -d --build
```

---

## 8. Desktop / Flutter / Android

| Client | Status |
|---|---|
| Web (React) | ✅ Primary |
| Electron desktop | Partial — `pnpm desktop:dev` (GTK may be missing on some Linux hosts) |
| Flutter / Android / iOS | ❌ Not in this repository |

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `Missing VITE_CLERK_PUBLISHABLE_KEY` | Set it in `.env` and restart Vite |
| `Unauthorized` on API | Sign in via Clerk, or use `/api/dev/login` only in `NODE_ENV≠production` |
| AI silent | Check OpenAI key; enable Auto-reply; Autopilot mode |
| No gifts | Demo mode needs an active session — click Go Live |
| Postgres auth failed | Reset: `ALTER USER livestorm WITH PASSWORD 'livestorm_dev';` |
