---
name: Ghost session fix
description: How stale/ghost live sessions were causing "Already live" 400 errors and the 3-case resolution pattern used to fix it.
---

## The problem
`POST /sessions/start` returned HTTP 400 "Already live" whenever `streamer.isLive=true` in the DB, even if the in-memory connector was dead (after a server restart) or in error state. This blocked users from restarting a broken session.

## The 3-case resolution in sessions.ts

| Condition | Action |
|-----------|--------|
| `isLive=true` but no open session in DB | Clear stale `isLive` flag and fall through to create a new session |
| Open session exists but connector is dead/error | Stop stale connector (if error), reconnect same session — no new session created |
| Open session exists and connector is running | Return existing session data (no 400, no duplicate) |

**Why:** after a server restart the in-memory `activeConnectors` map is wiped, so every previously-live session looks dead. The old code returned 400 in all cases; the fix treats the session as reconnectable.

## Supporting pieces
- `POST /sessions/force-stop` — hard-resets any open session + clears `isLive` flag; returns `{ ok, clearedSessionId }`.
- `cleanupStaleSessions()` in `tiktokConnector.ts` — called on startup; marks sessions >24 h old as ended.
- "Force Reset Session" button in live-studio.tsx and "Reset" button in dashboard.tsx both call `useForceStopSession`.

## How to apply
Whenever adding new "start session" logic, always check connector state before returning an error. Return the existing session data rather than blocking — the frontend can handle a session that already exists.
