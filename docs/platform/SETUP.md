# SYLORA — Local setup

## Prerequisites

- Docker & Docker Compose **or** local PostgreSQL 16+ and Redis 7+
- Node.js 22+
- Python 3.12+
- pnpm 9+

## Quick start (Docker)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start infrastructure
docker compose -f infrastructure/dev/docker-compose.yml up -d

# 3. Install dependencies
pnpm install
cd services/platform-api && python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# 4. Run migrations
cd services/platform-api && alembic upgrade head

# 5. Start API
cd services/platform-api && uvicorn platform_api.main:app --reload --port 8080

# 6. Start web (separate terminal)
cd apps/web && pnpm dev
```

## Quick start (system Postgres/Redis)

If Docker is unavailable, use local services on default ports and update `.env`:

```bash
DATABASE_URL=postgresql://sylora:sylora@localhost:5432/sylora
REDIS_URL=redis://localhost:6379/0
```

Create the database user/db once, then follow steps 3–6 above.

## URLs (local)

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:8080 |
| API docs | http://localhost:8080/docs |
| Admin | http://localhost:3001 (Phase 1) |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6380 |

## Environment variables

See root `.env.example`. Required for Phase 0:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — min 32 random bytes (generate locally)

Optional (explicit failure when used unconfigured):

- `OPENAI_API_KEY` — AI features
- `STRIPE_*` — payments
- `S3_*` — media storage

## Verification

```bash
./scripts/verify-phase0.sh
```

Expected: API health 200, web home loads, DB migration applied.
