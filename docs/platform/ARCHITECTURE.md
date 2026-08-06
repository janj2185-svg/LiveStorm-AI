# SYLORA — Architecture (v2)

## Summary

SYLORA v2 is a **modular monolith** with a clear path to horizontal scaling and selective service extraction.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│  apps/web (Next.js)   apps/admin (Next.js)   [Phase 7: native]  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / WSS
┌───────────────────────────────▼─────────────────────────────────┐
│              services/platform-api (FastAPI)                      │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐          │
│  │Identity │ Content │  Live   │ Wallet  │   AI    │  ...     │
│  └────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘          │
│       │         │         │         │         │                 │
│  ┌────▼─────────▼─────────▼─────────▼─────────▼────┐          │
│  │           Infrastructure layer                     │          │
│  │  PostgreSQL │ Redis │ Object storage │ Workers     │          │
│  └───────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Key technical decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend runtime | Python 3.12+ / FastAPI | Team stack, async I/O, OpenAPI |
| Primary DB | PostgreSQL 16 | ACID, JSON, full-text, mature ops |
| Cache / pubsub foundation | Redis 7 | Sessions, rate limits, realtime fan-out |
| Web client | **Next.js 15 (App Router)** | SEO, performance, i18n, web UX velocity |
| Admin | Next.js (separate app) | Isolated deploy surface, RBAC UI |
| Mobile/desktop | Deferred to Phase 7 | Evaluate Flutter/RN after web core is proven |
| API style | REST `/v1` + OpenAPI; WebSocket for realtime | Versioned, documented |
| Monolith vs microservices | **Modular monolith** | Faster iteration; extract when bounded |
| Migrations | Alembic, version-controlled | Reproducible environments |
| i18n | `next-intl` + message catalogs | UK, PL, EN from day one |
| Design system | `packages/ui` shared tokens + components | Single visual source of truth |
| Secrets | Environment only; never in git | `.env.example` documents required keys |
| Observability | Structured JSON logs; `/health`, `/ready` | Expand to metrics/tracing in Phase 3+ |

## Module layout (backend)

```
services/platform-api/src/platform_api/
  main.py                 # FastAPI app factory
  config.py               # pydantic-settings
  api/v1/                 # HTTP routers (thin)
  domains/                # Business logic per bounded context
    identity/
    shared/
  infrastructure/         # DB, Redis, storage adapters
```

**Rule:** `api` layers call `domains`; domains never import from `api`.

## Security baseline

- JWT access + rotating refresh sessions (httpOnly cookie option for web)
- RBAC on admin routes
- Rate limiting via Redis (Phase 1)
- Input validation on all boundaries (Pydantic)
- CORS explicitly configured per environment
- See [SECURITY.md](./SECURITY.md)

## Integration boundaries

External capabilities (payments, OpenAI, CDN, RTMP, OAuth providers) sit behind **adapter interfaces**. Unconfigured adapters return explicit `503` with problem details — never fake success.

## Deployment targets

| Environment | Purpose |
|-------------|---------|
| `dev` | Docker Compose local stack |
| `staging` | Pre-production integration |
| `production` | Kubernetes when scale warrants; Compose acceptable early |
