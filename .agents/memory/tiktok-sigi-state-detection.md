---
name: TikTok SIGI_STATE live detection bug
description: The correct SIGI_STATE field for detecting live status — wrong field caused real streams to be reported as offline.
---

## The Rule
Use `sigiState.LiveRoom.liveRoomStatus` (top-level) to determine if a user is streaming.
Do NOT use `sigiState.LiveRoom.liveRoomUserInfo.user.status` — that is the user account status.

## Why
Diagnostic run on 2026-06-08 while user was live revealed:
- `LiveRoom.liveRoomUserInfo.user.status === 2` — always 2, regardless of live state (user account status)
- `LiveRoom.liveRoomUserInfo.liveRoom.status === 2` — also always 2 (persistent room status)
- `LiveRoom.liveRoomStatus === 0` — definitively 0 when NOT streaming

The old code checked `user.status === 4` which is the WRONG field and WRONG value (4 appears to be "ended" in room context). This caused the detection to always return isLive=false even when streaming.

## How to Apply
```typescript
const topLevelStatus = Number(sigiState?.LiveRoom?.liveRoomStatus ?? -1);
if (topLevelStatus === 0) return { isLive: false, roomId };   // definitively offline
if (topLevelStatus > 0)  return { isLive: true, roomId };    // live
// -1 = field missing → fallback to roomId presence
```

## Fallback
If SIGI_STATE is missing or unparseable → return `{ isLive: true }` and let the WebSocket connection attempt be the ground truth. Never block connection on parse failure.
