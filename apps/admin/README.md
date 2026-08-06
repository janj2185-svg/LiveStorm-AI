# SYLORA Admin Console

Next.js operations console for the SYLORA FastAPI backend.

## Run

```bash
cd apps/admin
cp .env.example .env.local
npm install
npm run dev
```

Open http://127.0.0.1:4317 and sign in with an `owner` / `admin` account
(e.g. `owner@sylora.dev` after seeding).

## Capabilities

- Login against `/v1/auth/login` (no demo tokens)
- Overview metrics from admin + diagnostics APIs
- User search, suspend, restore
- Feature flag listing
- Live diagnostics / health payload
