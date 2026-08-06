# SYLORA Admin Console

A production admin console for SYLORA, built with Next.js 15 (App Router), TypeScript, and
React 19. It talks directly to the SYLORA FastAPI service (`services/api`) — no mocked data,
no invented endpoints. Every page calls a real `/v1/admin/*` (or adjacent) route and honestly
surfaces loading, empty, and error states when data or permissions are unavailable.

## Design

"Light Ethereal": white / pearl / gold / sky / violet glassmorphism on a soft gradient
background. There is no dark theme. All surfaces are frosted-glass cards (`backdrop-filter:
blur`) with a gold primary call-to-action and violet/sky accents. Layout is a left navigation
rail on desktop that collapses to a top bar + pill nav on narrow viewports.

## Getting started

```bash
cd apps/admin
cp .env.example .env.local   # point at your running SYLORA API if not localhost:8000
npm install
npm run dev
```

The app runs on <http://localhost:3000> and expects the SYLORA API at
`NEXT_PUBLIC_API_BASE_URL` (defaults to `http://127.0.0.1:8000`). Start `services/api` locally
(see `services/api/README.md`) before signing in.

### Scripts

| Script          | Description                                   |
| ---------------- | ---------------------------------------------- |
| `npm run dev`    | Start the Next.js dev server                   |
| `npm run build`  | Production build (`next build`)                |
| `npm run start`  | Serve the production build (`next start`)       |
| `npm run lint`   | Lint with `next lint` / `eslint-config-next`    |

## Authentication

- Sign-in calls `POST /v1/auth/login` with `{ email, password, device_label }`, matching
  `LoginRequest` in `services/api/app/schemas.py`.
- If the account has TOTP enabled, the API returns `mfa_required: true` with a
  `challenge_token`; the console then calls `POST /v1/auth/totp/verify`.
- On success, the access + refresh tokens are kept **in memory** (a React ref) and mirrored to
  `sessionStorage` (never `localStorage`) so a page reload doesn't force a re-login within the
  same tab, while still limiting the token's lifetime and XSS blast radius versus persistent
  storage.
- Every authenticated request is wrapped by `useAuth().callWithAuth`, which retries once via
  `POST /v1/auth/refresh` on a 401 before giving up and returning to `/login`.
- After sign-in, the console calls `GET /v1/auth/me` and checks `roles`. Accounts without the
  `admin` or `owner` role see a full-page **Access Denied** screen — the console never fakes
  authorization.

## Pages

| Route            | Purpose                                                              | API calls                                                                                                          |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/login`          | Ethereal glass sign-in + TOTP challenge                                | `POST /v1/auth/login`, `POST /v1/auth/totp/verify`                                                                  |
| `/`                | Dashboard KPIs, service health, security snapshot                       | `GET /v1/admin/analytics`, `GET /v1/admin/service-health`, `GET /v1/admin/security`                                 |
| `/users`           | Search/filter accounts, suspend/restore with reason                      | `GET /v1/admin/users`, `POST /v1/admin/users/{id}/suspend`, `POST /v1/admin/users/{id}/restore`                     |
| `/moderation`      | Trust & safety queue: summary, resolve, escalate                        | `GET /v1/admin/moderation/summary`, `GET /v1/trust-safety/reports`, `POST /v1/trust-safety/reports/{id}/resolve`, `POST /v1/trust-safety/reports/{id}/escalate` |
| `/gifts`           | Gift economy KPI + targeted refund console                              | `GET /v1/admin/analytics` (gifts KPI), `POST /v1/admin/gifts/sends/{id}/refund`, `POST /v1/admin/gifts/inventory/{id}/refund` |
| `/settings`        | Feature flags + versioned platform settings                             | `GET/POST/PATCH /v1/admin/feature-flags[/...]`, `GET/PUT /v1/admin/settings[/...]`                                  |
| `/integrations`    | Read-only owner-config provider catalog + deploy readiness               | `GET /v1/admin/owner-config`, `GET /v1/admin/owner-config/deploy-readiness`                                          |

The gifts page intentionally does **not** show a fabricated list of gift sends: the FastAPI
service only exposes refund-by-ID endpoints (`/v1/admin/gifts/sends/{id}/refund` and
`/v1/admin/gifts/inventory/{id}/refund}`), so the console offers exactly those actions plus an
honest note about the missing ledger-listing endpoint. Likewise, `/integrations` is read-only:
provider secrets are configured server-side (`services/api/app/routers/admin_owner_config.py`)
and are never requested or displayed by this console.

## Project structure

```
src/
  app/
    login/page.tsx            Public sign-in page
    (protected)/layout.tsx    Wraps every other route with RequireAdmin (role gate)
    (protected)/page.tsx      Dashboard
    (protected)/users/...
    (protected)/moderation/...
    (protected)/gifts/...
    (protected)/settings/...
    (protected)/integrations/...
  components/                 Glass UI kit: cards, buttons, tables, modals, states
  lib/
    api-client.ts             Typed fetch wrapper + ApiError/NetworkError + endpoint functions
    auth-context.tsx          Token storage, login/MFA/refresh/logout, role gate
    types.ts                  TypeScript types mirroring the FastAPI response schemas
    use-authed-query.ts       Small data-fetching hook built on callWithAuth
```

## Notes

- Dependencies are intentionally minimal: `next`, `react`, `react-dom` at runtime, plus
  TypeScript/ESLint tooling for development. There is no CSS framework — the ethereal theme is
  hand-written CSS Modules + a small set of CSS variables in `src/app/globals.css`.
- `node_modules` and `.next` are git-ignored; run `npm install` before `npm run dev|build|start`.
