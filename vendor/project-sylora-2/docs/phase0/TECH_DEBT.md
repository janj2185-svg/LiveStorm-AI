# TECH_DEBT

1. Redis unused — wire rate limits / job queues before LIVE/translation.
2. SQLAlchemy `create_all` instead of Alembic migrations — add migrations before production schema drift.
3. Marketplace seed on lifespan — move to idempotent migration/seed command.
4. No structured logging / OpenTelemetry yet.
5. Frontend forms are client-fetch; consider server actions for progressive enhancement.
6. Avatar assets duplicated from LiveStorm design system — later share via package or CDN.
7. `docs/` previously empty — keep phase docs updated after each stage.
8. Dual-repo Sylora history (LiveStorm-AI) — document canonical product surface for getsylora.com.
9. ESLint/Next build must run in CI with Auth env stubs.
10. Developer webhook_url stored but not delivered.
