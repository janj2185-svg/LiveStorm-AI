---
name: lib/db TypeScript project references rebuild
description: lib/db uses composite TS project references — api-server reads from dist/ not src/; must rebuild after schema changes
---

## Rule
After adding or modifying any file in `lib/db/src/schema/`, run:
```
npx tsc --build lib/db
```
to regenerate `lib/db/dist/schema/*.d.ts`. The api-server resolves `@workspace/db` via TypeScript project references pointing at `lib/db/dist/`, **not** `lib/db/src/`. Without this step, new schema tables simply don't exist as far as tsc is concerned.

**Why:** `lib/db/tsconfig.json` has `"composite": true` and `"emitDeclarationOnly": true`. The pnpm workspace exports point to `./src/index.ts` for runtime, but the TypeScript compiler follows project references to `dist/` for type resolution.

**How to apply:** Any time a new table or type is added to `lib/db/src/schema/*.ts` or `schema/index.ts` and TS errors appear claiming the symbol doesn't exist in `@workspace/db`, the root cause is a stale dist/. Run the build command above — it takes ~1-2s. The `pnpm --filter @workspace/db build` command does NOT trigger tsc (no build script in package.json); only `npx tsc --build lib/db` works.

## Schema collision rule
`subscriptions.ts` exports `viewerProfilesTable` (gamification: userId, xp, level, coins).
`agents.ts` exports `agentViewerProfilesTable` (AI tracking: tiktokViewerId, viewerName, totalGifts, vipLevel) — DB table `agent_viewer_profiles`.
Never rename or merge these; they serve different purposes.

## Route auth pattern
Route handlers in `routes/agents.ts` (and similar new routes) access Clerk user ID via:
`const user = await getOrCreateUser((req as any).clerkUserId);`
The `clerkUserId` property is set dynamically by the `requireAuth` middleware (`req.clerkUserId = userId`) but is not formally typed on Express Request. Use `(req as any).clerkUserId` or follow the pattern in `routes/moderation.ts` / `routes/avatar.ts` which extract it into a typed helper `getStreamer(clerkUserId: string)`.
