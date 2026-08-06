# SYLORA Platform (v2)

**AI-first digital ecosystem** — greenfield production build.

> The previous codebase (`apps/sylora`, `services/api`, etc.) is **legacy** and not the foundation for this project. See [`legacy/README.md`](legacy/README.md).

## Quick start

```bash
cp .env.example .env
docker compose -f infrastructure/dev/docker-compose.yml up -d
pnpm install
cd services/platform-api && python3 -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"
alembic upgrade head
uvicorn platform_api.main:app --reload --port 8080
# separate terminal:
cd apps/web && pnpm dev
```

- Web: http://localhost:3000
- API docs: http://localhost:8080/docs

## Structure

```
apps/web              Production web client (Next.js 15)
apps/admin            Admin console (Phase 1)
services/platform-api Backend modular monolith (FastAPI)
packages/ui           Design system tokens + global styles
docs/platform/        Architecture, security, roadmap
infrastructure/dev/   Docker Compose for local dev
legacy/               Archived previous iteration (do not extend)
```

## Documentation

| Doc | Path |
|-----|------|
| Product | [docs/platform/PRODUCT.md](docs/platform/PRODUCT.md) |
| Architecture | [docs/platform/ARCHITECTURE.md](docs/platform/ARCHITECTURE.md) |
| Setup | [docs/platform/SETUP.md](docs/platform/SETUP.md) |
| Roadmap | [docs/platform/ROADMAP.md](docs/platform/ROADMAP.md) |

## Phase status

**Phase 0** — Foundation: API health, DB extensions, design system, i18n shell (UK/PL/EN), dev infrastructure.

**Next: Phase 1** — Auth, profile, posts, feed, notifications (first vertical E2E flow).

## Principles

- No fake APIs or simulated readiness
- Modular monolith → extract services when justified
- Web-first (Next.js); native clients in Phase 7
- Immutable ledger for all financial operations (Phase 4)
