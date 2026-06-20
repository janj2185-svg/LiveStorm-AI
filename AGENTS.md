# AGENTS.md

## Cursor Cloud specific instructions

LiveStorm AI is a pnpm-workspace monorepo (a TikTok LIVE gamification SaaS). The
two runnable services for end-to-end work are the **API server** and the
**frontend**; both must be running together (the frontend dev server proxies
`/api` → `http://localhost:8080`).

Standard commands live in `replit.md` ("Run & Operate") and each package's
`package.json` — reference those rather than duplicating. The notes below are
the non-obvious caveats discovered while setting up the cloud environment.

### Runtime / package manager
- Use **pnpm** from the repo root (`pnpm install`). A `preinstall` guard rejects
  npm/yarn. The update script already runs `pnpm install` on VM startup.
- The default **Node 22** toolchain builds, typechecks, and runs everything
  fine, even though `.replit` nominally targets Node 24.

### PostgreSQL (required, not auto-started)
- The app needs a Postgres database; nothing runs without `DATABASE_URL`.
- A local PostgreSQL 16 cluster is installed in the VM image but is **not**
  started automatically. Start it each session and export the URL:
  ```bash
  sudo pg_ctlcluster 16 main start
  export DATABASE_URL="postgresql://livestorm:livestorm@localhost:5432/livestorm"
  ```
  (Role `livestorm` / db `livestorm` were created during setup.)
- Apply the Drizzle schema after DB changes: `pnpm --filter @workspace/db run push`.

### Required env vars to boot (gotchas)
- **api-server crashes at module load** unless OpenAI vars are set — even
  placeholders are enough to boot (real AI features need a real key):
  `AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1`,
  `AI_INTEGRATIONS_OPENAI_API_KEY=sk-...`.
- A **global Clerk middleware** wraps every route: without a *well-formed*
  `CLERK_SECRET_KEY` **and** `CLERK_PUBLISHABLE_KEY`, even `/api/healthz`
  returns HTTP 500. Any non-empty string secret + any syntactically valid
  `pk_test_<base64("host$")>` publishable key let unauthenticated/public
  endpoints work, but **verifying real user tokens (the dashboard/auth flow)
  requires a real Clerk instance** (`sk_test_`/`pk_test_` from dashboard.clerk.com,
  set as secrets `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and
  `VITE_CLERK_PUBLISHABLE_KEY`).
- **frontend** throws on load without `VITE_CLERK_PUBLISHABLE_KEY`, and its
  `vite.config.ts` throws without `PORT` and `BASE_PATH` (use `PORT=23121`,
  `BASE_PATH=/`).

### Running the services
```bash
# Terminal 1 — API (port 8080). Rebuilds via esbuild then starts; NOT a watcher,
# so re-run after any backend code change.
DATABASE_URL=... PORT=8080 NODE_ENV=development TIKTOK_MODE=demo \
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1 AI_INTEGRATIONS_OPENAI_API_KEY=sk-x \
CLERK_SECRET_KEY=... CLERK_PUBLISHABLE_KEY=... \
pnpm --filter @workspace/api-server run dev

# Terminal 2 — frontend (port 23121, Vite HMR is instant)
PORT=23121 BASE_PATH=/ VITE_CLERK_PUBLISHABLE_KEY=... \
pnpm --filter @workspace/livestorm-ai run dev
```
- `TIKTOK_MODE=demo` uses the built-in simulator (no real TikTok / no
  `tiktok-live-connector`, which is intentionally absent in dev).

### Testing without a real Clerk instance
- OBS overlay routes (`/obs/*`) bypass Clerk entirely, and
  `GET /api/obs/state/:streamerId` is auth-free — it only needs an OBS token,
  which is an HMAC of `{streamerId,exp}` signed with `CLERK_SECRET_KEY`. You can
  mint one yourself with the same secret, seed `streamers` + an open `sessions`
  row + `viewer_xp_events`, then load
  `/obs/leaderboard?streamerId=<id>&token=<token>` to exercise the live
  leaderboard pipeline (Vite → proxy → API → Postgres) end-to-end.

### Static checks
- There is no ESLint; `pnpm run typecheck` (tsc across all packages) is the
  static gate. `typecheck:libs` emits the `@workspace/db` declarations that
  dependent packages need.
