# LiveStorm AI

A production-ready TikTok LIVE interaction SaaS platform that turns live streams into living games — combining real-time gamification, viewer progression, OBS overlays, kingdom building, AI assistants, and boss battles.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/livestorm-ai run dev` — run the frontend (port 23121)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Before running `typecheck` on `@workspace/api-server`, run `pnpm --filter @workspace/db exec tsc --build tsconfig.json` once to generate db declarations

## Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (provisioned automatically) |
| `CLERK_SECRET_KEY` | Clerk backend secret key (`sk_test_...`) |
| `CLERK_PUBLISHABLE_KEY` | Clerk frontend publishable key (`pk_test_...`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same as `CLERK_PUBLISHABLE_KEY` — exposed to the Vite frontend |
| `VITE_CLERK_PROXY_URL` | Clerk proxy URL — empty in dev, auto-set in production by Replit |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS v4 + shadcn/ui + Wouter + Clerk React
- API: Express 5 + Clerk Express middleware
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (app_3EoSQvG2NVkqRRX6iyxkqYwH6cI)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi-spec.yaml`)
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/api-server/src/routes/` — Express route handlers (auth, health, users, streamers, kingdoms)
- `artifacts/livestorm-ai/src/pages/` — React page components (home, dashboard, live-studio, gamification, kingdom, overlays, ai-assistant, settings)
- `artifacts/livestorm-ai/src/components/layout.tsx` — App shell with sidebar navigation
- `lib/db/src/schema/` — Drizzle ORM table definitions (source of truth for DB schema)
- `lib/api-spec/openapi-spec.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — Generated React Query hooks and Zod schemas (do not edit)

## Architecture decisions

- **Clerk proxy pattern**: `VITE_CLERK_PROXY_URL` is empty in dev so Clerk calls go directly; in production Replit auto-populates the proxy URL. `publishableKeyFromHost` from `@clerk/react/internal` is used so the correct key is selected for both environments.
- **Protected routes**: All app routes (`/dashboard`, `/live-studio`, etc.) are wrapped in `<ProtectedRoute>` which redirects unauthenticated users to `/sign-in`. The root `/` shows the landing page to signed-out users and redirects to `/dashboard` for signed-in users.
- **TypeScript project references**: `lib/db` uses `composite: true`. Run `pnpm --filter @workspace/db exec tsc --build tsconfig.json` to emit declarations before typechecking dependent packages.
- **API client generation**: Edit `lib/api-spec/openapi-spec.yaml`, then run codegen to regenerate typed hooks. Never edit generated files directly.
- **Cyberpunk dark theme**: Deep space navy background (#0f172a), electric purple primary (#7c3aed), neon cyan accent (#06b6d4). Defined in `artifacts/livestorm-ai/src/index.css` CSS custom properties.

## Product

LiveStorm AI lets TikTok streamers turn their live sessions into interactive games. Viewers earn XP and level up by sending gifts and comments. Streamers build kingdoms using gift-derived resources. OBS overlays show live leaderboards and events. An AI assistant automates responses and reactions. Boss battle events let viewers team up against a shared challenge.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Clerk `signUpUrl`/`signInUrl` in `<ClerkProvider>` must NOT be prefixed with `basePath` — that's handled internally by `routerPush`/`routerReplace`.
- Route paths in Wouter for Clerk pages must use `/*?` suffix (e.g., `/sign-in/*?`) to match sub-routes Clerk uses internally.
- When seeding demo data, use `ON CONFLICT DO NOTHING` since the schema has unique constraints.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
