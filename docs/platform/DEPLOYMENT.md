# SYLORA — Deployment

## Environments

| Env | Branch | Purpose |
|-----|--------|---------|
| dev | local | Developer machines via Docker Compose |
| staging | `main` | Integration testing |
| production | tagged releases | Live users |

## Phase 0–1 target

- **API:** container image `sylora-platform-api`, run with env from secret manager
- **Web:** static/SSR on Vercel or container behind CDN
- **DB:** managed PostgreSQL (RDS, Cloud SQL, etc.)
- **Redis:** managed Redis

## Health checks

- `GET /v1/health` — liveness (process up)
- `GET /v1/ready` — readiness (DB + Redis connected)

## Migrations

Run `alembic upgrade head` as a release job before traffic shift.

## Backups

- PostgreSQL: daily automated snapshots
- Object storage: versioning enabled on media bucket

## Observability (Phase 3+)

- Structured JSON logs → aggregation
- Prometheus metrics endpoint
- OpenTelemetry tracing on API boundaries
