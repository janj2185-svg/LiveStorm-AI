# SYLORA Admin (Next.js)

Light-first operations console for platform administration.

## Run

```bash
# API must already be up (./start-local.sh --host)
cd apps/admin
cp .env.example .env.local   # optional
npm install
npm run dev
```

Open `http://localhost:3000`.

Sign in with an admin account, e.g. `owner@sylora.dev` / `OwnerTest!2026Local`.

## Environment

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_SYLORA_API_BASE_URL` | `http://127.0.0.1:8000/v1` |

## Surfaces

Real FastAPI routes only:

- `POST /auth/login`, `GET /auth/me`
- `GET /admin/analytics`
- `GET /admin/users`
- `GET /admin/feature-flags`
- `GET /admin/settings`
- `GET /admin/audit`
- `GET /admin/service-health`
- `GET /admin/security`

Tokens stay in `sessionStorage` for the browser tab. There is no simulated success when the API denies access.
