# Legacy SYLORA codebase (archived)

This directory documents the **previous** SYLORA monorepo iteration (`apps/sylora` Flutter client, `services/api`, gift-studio, etc.).

It is **not** the foundation for the new SYLORA platform started in Phase 0.

## New platform (active)

| Component | Path |
|-----------|------|
| Production web client | `apps/web` |
| Admin console | `apps/admin` |
| Backend API (modular monolith) | `services/platform-api` |
| Shared UI / design system | `packages/ui` |
| Documentation | `docs/platform/` |
| Local infrastructure | `infrastructure/dev/` |

Do not extend legacy modules unless explicitly migrating a verified capability into the new bounded domains.
