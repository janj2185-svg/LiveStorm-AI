# SYLORA Admin

Independent Next.js App Router admin console for the SYLORA FastAPI service.

## Run locally

This app uses npm independently from the repository's pnpm workspace.

```bash
cd apps/admin
npm install
NEXT_PUBLIC_SYLORA_API_BASE_URL=http://localhost:8000 npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If
`NEXT_PUBLIC_SYLORA_API_BASE_URL` is omitted, the client defaults to
`http://localhost:8000`.

The API must allow the admin app's browser origin through CORS. Sign in with an existing SYLORA
account that has the permissions required by the admin endpoints.

## Authentication

The login flow calls `POST /v1/auth/login`, supports the API's TOTP challenge when required, and
validates the session with `GET /v1/auth/me`. The access token is kept in React memory and
`sessionStorage`; it is cleared when the tab session ends or the user logs out. Logout calls
`POST /v1/auth/logout`.

## Live API sources

- `/` — `GET /health/ready`
- `/users` — `GET /v1/admin/users?limit=100`
- `/moderation` — `GET /v1/social/moderation/reports?limit=100`
- `/gifts` — `GET /v1/gifts/catalog?limit=100`
- `/ai` — `GET /v1/admin/ai/providers` and `GET /v1/admin/ai/usage?limit=100`
- `/live` — `GET /v1/live/sessions` and `GET /v1/admin/live/platforms`
- `/settings` — displays the configured API base URL and authenticated user from
  `GET /v1/auth/me`

Every data page renders the API's empty collection or error response honestly. It does not fall
back to sample data.

## Production build

Public Next.js environment variables are embedded at build time, so set the API URL during the
build:

```bash
NEXT_PUBLIC_SYLORA_API_BASE_URL=https://api.example.com npm run build
npm start
```
