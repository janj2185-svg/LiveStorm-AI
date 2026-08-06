# SYLORA — Testing strategy

## Pyramid

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | pytest, vitest | Domain logic, utilities |
| Integration | pytest + testcontainers / docker | API + DB |
| E2E | Playwright (Phase 1+) | Critical user flows |
| Manual | Smoke checklist | Owner acceptance |

## Phase 0 gates

- `pytest` — API health, config validation
- `pnpm test` — UI token tests, i18n key parity
- `pnpm lint` — ESLint, Ruff

## Phase 1 mandatory E2E flows

1. Register → verify email (dev mail catcher) → login
2. Create post → visible on second account feed
3. React + comment + notification
4. Follow user
5. Locale switch UK/PL/EN

## Financial / gift tests (Phase 4+)

- Ledger double-entry invariant tests
- Idempotent payment webhook handling
- Gift purchase → event → renderer payload validation

## Accessibility

- axe-core in Playwright CI (Phase 1)
- Reduced motion respected in design system
