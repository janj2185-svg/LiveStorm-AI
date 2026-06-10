---
name: LiveSessionContext single socket
description: useLiveSession must only be called from LiveSessionContext, never directly in pages. All pages use useLiveSessionContext() hook.
---

## Rule
Never call `useLiveSession()` or `useGetActiveSession()` directly in pages that render inside `<Layout>`. Always use `useLiveSessionContext()` from `src/contexts/LiveSessionContext.tsx`.

## Why
Before the context existed, each page (Dashboard, Live Studio, AI Co-Host, Automation, Gamification, Boss Battle) independently called `useLiveSession(sessionId)` which creates a new Socket.IO connection on mount. With 5 pages, that was 5 simultaneous sockets for the same session room.

`LiveSessionContext` is mounted once inside `<Layout>` (wraps `{children}` in the main content area) and calls `useLiveSession` and `useGetActiveSession` exactly once. Confirmed working: `totalSocketsInRoom=1` in server logs.

## How to Apply
- New pages inside Layout: import from `@/contexts/LiveSessionContext`, call `useLiveSessionContext()`
- Pages outside Layout (OBS overlays, public routes): these should NOT use `useLiveSessionContext()` — OBS overlays use `useObsSocket` (token auth, intentionally separate)
- Boss Battle still owns a second socket for `boss:attacked/defeated/spawned` events (these aren't in useLiveSession yet). This is known tech debt.
- Pages that only call `useGetActiveSession` without `useLiveSession` (kingdom, mini-games, moderation) haven't been migrated yet — no socket issue but worth migrating for consistency.

## Type Notes
- `activeSessionRes` is typed as `any` in the context (the generated API client returns `{}` for its data type)
- `sessionMode` is cast to `ConnectionMode | null` when passed to `useLiveSession`
- `activeSessionId` is `number | undefined` (not null) — use `?? null` where `number | null` is required
