# SYLORA — Owner Testing Guide

**Product:** SYLORA (not LiveStorm AI)  
**Repo path:** `/workspace` (clone of `github.com/janj2185-svg/LiveStorm-AI`)  
**Active branch:** `cursor/sylora-gift-library-5b96`  
**Identity doc:** `docs/implementation/ACTIVE_PROJECT_IDENTITY.md`

> The GitHub remote is still named LiveStorm-AI. The **code tree on this branch is SYLORA** (`apps/sylora`, `services/api`, `packages/gift-runtime`, Lumen gallery in `src/`).

---

## A. Prerequisites

### Docker path (preferred)

- Docker Engine 24+ with Compose v2.20+
- ~12 GB RAM for full stack
- Node.js 22+ and pnpm 11 (for the design gallery)
- Git

### Host path (no Docker)

- Python 3.12 + `python3-venv`
- PostgreSQL 16 listening on `127.0.0.1:5432`
- Redis 7 on `127.0.0.1:6379`
- Node.js 22+ and pnpm 11
- `curl`, `openssl`

```bash
# Ubuntu/Debian example
sudo apt-get update
sudo apt-get install -y python3.12-venv postgresql redis-server curl openssl
corepack enable && corepack prepare pnpm@11.18.0 --activate
```

---

## B. Open the repository

```bash
cd /path/to/LiveStorm-AI   # or /workspace in cloud agents
git fetch origin
git checkout cursor/sylora-gift-library-5b96
git log -1 --oneline
```

Confirm identity:

```bash
head -30 docs/implementation/ACTIVE_PROJECT_IDENTITY.md
ls apps/sylora services/api packages/gift-runtime
```

---

## C. Environment files

| File | Purpose |
|---|---|
| `.env.example` | Template for Docker Compose → copy to `infrastructure/.env` |
| `.env.local.example` | Host-mode template → copy to `.env.local` and `services/api/.env` |
| `infrastructure/.env` | Compose secrets (gitignored) |
| `.env.local` / `services/api/.env` | Host API config (gitignored) |

**Required local:** database, Redis, JWT, encryption keys, CORS  
**Optional:** S3, OpenAI, YouTube/Twitch OAuth, Stripe, MediaMTX  
**Production-only:** `ENVIRONMENT=production`, OTEL endpoints, HMAC service health  

Unavailable integrations must show **Provider not configured** and must not crash or fake success.

---

## D. One-command startup

### Preferred (Docker)

```bash
./setup-local.sh
docker compose up --build
# or:
./start-local.sh
```

Then (gallery is not inside Compose):

```bash
pnpm install && pnpm dev
```

### Host mode (this agent / no Docker)

```bash
./setup-local.sh --host
./start-local.sh --host
./verify-local.sh
```

### Stop / reset

```bash
./stop-local.sh
./reset-local.sh    # destructive — type RESET
```

### Windows PowerShell

```powershell
.\setup-local.ps1
.\start-local.ps1
.\verify-local.ps1
.\stop-local.ps1
.\reset-local.ps1
```

---

## E. Exact local URLs

| Surface | URL |
|---|---|
| Main design gallery (SYLORA UI) | http://127.0.0.1:5173/ |
| Diagnostics | http://127.0.0.1:5173/#/diagnostics |
| Gift Library store | http://127.0.0.1:5173/#/gift-library-store |
| Admin panel (gallery) | http://127.0.0.1:5173/#/admin |
| AI Assistant | http://127.0.0.1:5173/#/assistant |
| AI Co-host | http://127.0.0.1:5173/#/cohost |
| Creator Studio | http://127.0.0.1:5173/#/studio |
| Marketplace | http://127.0.0.1:5173/#/marketplace |
| Education / learning | http://127.0.0.1:5173/#/learning |
| Business CRM | http://127.0.0.1:5173/#/business |
| Wallet | http://127.0.0.1:5173/#/wallet |
| Gifts (commerce UI) | http://127.0.0.1:5173/#/gifts |
| API docs | http://127.0.0.1:8000/docs |
| API live | http://127.0.0.1:8000/health/live |
| API ready | http://127.0.0.1:8000/health/ready |
| API diagnostics JSON | http://127.0.0.1:8000/v1/diagnostics |
| Mailpit UI (Compose only) | http://127.0.0.1:8025 |
| MinIO console (Compose only) | http://127.0.0.1:9001 |
| Gift Studio (optional npm) | http://127.0.0.1:4317 |
| Flutter client | requires Flutter SDK — not started by host scripts |

> Gallery screens are **design-system implementations**. Many show real UI chrome with demo data; wallet/gift **API** flows need the FastAPI backend + seeded accounts.

---

## F. Test account credentials (local only)

Seeded by `scripts/seed_owner_accounts.py` (run automatically from `start-local.sh --host`).  
Product demo (handles, wallet top-ups, follows, posts, DM) is seeded by `scripts/seed_product_demo.py` (also hooked into `start-local.sh`).

| Role | Email | Password |
|---|---|---|
| Owner / admin | `owner@sylora.dev` | `OwnerTest!2026Local` |
| Creator | `creator@sylora.dev` | `CreatorTest!2026Local` |
| Streamer | `streamer@sylora.dev` | `StreamerTest!2026Local` |
| Regular user | `user@sylora.dev` | `UserTest!2026Local` |
| Gift receiver | `viewer@sylora.dev` | `ViewerTest!2026Local` |

**Do not use these in production.** They are local testing only.

Demo handles after product seed: `@sylora.owner`, `@sylora.creator`, `@sylora.streamer`, `@sylora.user`, `@sylora.viewer`.

Login smoke test:

```bash
curl -s -X POST http://127.0.0.1:8000/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@sylora.dev","password":"OwnerTest!2026Local"}'
```

Product-loop verify (login → wallet → feed → messaging; gifts READY still 0):

```bash
./verify-product-loop.sh
# or full stack:
./verify-local.sh
```

Roadmap / confirmation gates: `docs/implementation/OWNER_PRODUCT_ROADMAP.md`

---

## G. Testing gifts

1. Open http://127.0.0.1:5173/#/gift-library-store  
2. Read status badges — **READY count is 0**  
3. PARTIAL gifts (10) have local `preview.mp4` / `poster.png` under `artifacts/gift-library/<slug>/`  
4. Full honest inventory: `docs/implementation/GIFT_LIBRARY_OWNER_STATUS.md`  
5. Wallet send/receive requires API gift catalog publish + payment provider — **payment is Provider not configured** locally  

---

## H. Testing AI

- Gallery AI screens: `#/assistant`, `#/cohost`  
- Live API AI routes need provider configuration  
- Without `OPENAI_API_KEY` / provider configs → **Provider not configured** (fail closed)  

---

## I. Logs

| Mode | Location |
|---|---|
| Host | `.sylora-local/logs/api.log`, `vite.log`, `celery.log` |
| Docker | `docker compose logs -f api celery-worker` |

Collect for bugs:

```bash
./verify-local.sh | tee sylora-verify.txt
curl -s http://127.0.0.1:8000/v1/diagnostics | tee sylora-diagnostics.json
tail -n 200 .sylora-local/logs/api.log > sylora-api-tail.log
git rev-parse HEAD > sylora-commit.txt
```

---

## J. Runtime versions (verified on agent)

| Tool | Version |
|---|---|
| Node | v22.14.0 (+ pnpm 11.18.0) |
| Python | 3.12.3 |
| PostgreSQL | 16 |
| Redis | 7 |
| Flutter | not installed in agent |
| Docker | not installed in agent (use host scripts or install Docker Desktop) |

---

## K. Related docs

- `OWNER_ACCEPTANCE_CHECKLIST.md` — manual pass/fail checklist  
- `docs/implementation/GIFT_LIBRARY_OWNER_STATUS.md` — every gift status  
- `docs/implementation/CELESTIAL_PHOENIX_REPORT.md` — Divine gift candidacy  
- `infrastructure/README.md` — full Compose topology  
