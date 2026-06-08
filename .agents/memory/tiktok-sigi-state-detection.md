---
name: TikTok LIVE detection — all 3 root causes (definitive)
description: Complete analysis of why TikTok LIVE detection failed 3 times in production, and exactly how the fix works.
---

## The Rule
Do NOT use SIGI_STATE HTML to gate live detection.
Call `WebcastPushConnection.connect()` directly. The library uses the webcast API internally.
Match library errors with `isNotLiveError()` — the exact message is `"The requested user isn't online :("`.

## Root Causes (from reading library source client.js)

### Attempt 1 — user.status === 4
`user.status` is the TikTok USER ACCOUNT status (always 2 for active account), not stream status.
The SIGI_STATE `liveRoomUserInfo.user.status` field never equals 4 for normal accounts.

### Attempt 2 — liveRoomStatus > 0
Production logs showed `liveRoomStatus: 0` on EVERY request from server/datacenter IPs,
even during an active stream. TikTok serves placeholder SIGI_STATE to non-browser IPs.
`liveRoomStatus` is a UI loading state, not a stream status signal.

### Attempt 3 — remove SIGI_STATE pre-check but wrong error handling
Removed the pre-check correctly. Library throws `UserOfflineError("The requested user isn't online :(")`.
BUT 3 bugs in error handling:

**BUG 1: Missing error pattern**
`"isn't online"` was not in `isNotLiveError()` patterns.
`UserOfflineError.message = "The requested user isn't online :("` → never matched → exponential backoff.

**BUG 2: Wrong error event payload**
Library's `handleError()` emits: `{ info: string, exception: Error }` — NOT a plain Error.
`on("error")` handler did `err?.message` → `undefined` → `String(err)` → `"[object Object]"` → no match.
Fix: extract `errPayload?.exception?.message || errPayload?.info`.

**BUG 3: Double-firing**
Library calls `handleError()` (emits `error` event) AND re-throws.
Both `on("error")` AND `.catch()` fired → duplicate retry scheduling.
Fix: `on("error")` calls `settle()` first → `settled = true` → `.catch()` returns early.

## The Library's Actual Live Detection Flow

```
connect() → _connect()
  1. fetchRoomId(): HTML SIGI_STATE → roomId (ALWAYS present, even offline)
  2. fetchRoomInfo(): webcast API /room/info/?roomId=... → data.status
     - status === 4 → UserOfflineError("The requested user isn't online :(")
     - status !== 4 → live, continue to WebSocket
```

The library DOES work from server IPs for step 2 (webcast API). Only step 1 (SIGI_STATE)
has issues but roomId is stable/cached so it always succeeds.

## isNotLiveError() — Final Implementation

```typescript
export function isNotLiveError(err: unknown): boolean {
  // Accept both plain Error AND { info, exception } format from library's handleError()
  const asObj = err as any;
  const exception: unknown = asObj?.exception ?? err;
  const msg = (
    (exception instanceof Error ? exception.message : "") ||
    asObj?.info ||
    String(err)
  ).toLowerCase();

  return (
    msg.includes("isn't online")            || // PRIMARY: UserOfflineError from library
    msg.includes("failed to retrieve room") || // FetchIsLiveError: all sources exhausted
    // ... other patterns
  );
}
```

## What You'll See In Production Logs When Fixed

**When offline:**
```
on("error") for @username: The requested user isn't online :(
@username not live — polling in 30 s
```

**When live:**
```
✓ Connected to @username LIVE (roomId: 7649063751336954657)
```
