---
name: TikTok SIGI_STATE live detection — definitive failure analysis
description: Why all SIGI_STATE-based live detection failed, and the correct approach for server-side TikTok LIVE connection.
---

## The Rule
Do NOT use SIGI_STATE HTML page fetching to pre-check whether a user is live.
Go directly to `WebcastPushConnection.connect()` (tiktok-live-connector library) and let it determine live status via its own internal webcast API calls.

## Why
Production logs (confirmed during real LIVE stream, June 2026) showed:
- `liveRoomStatus: 0` on every single request from our server IP, even while the stream was active
- `user.status: 2` always (user account status — not stream status)
- `liveRoomObjStatus: 2` always (room initialized — not streaming signal)

TikTok intentionally serves placeholder SIGI_STATE to server/datacenter IPs. The `liveRoomStatus` field never becomes non-zero from these IPs regardless of actual stream state.

Two fixes both failed because they both read from this poisoned data source:
1. `user.status === 4` — wrong field (account status, always 2), wrong value
2. `liveRoomStatus > 0` — right field, but always 0 from server IPs

The library (`tiktok-live-connector`) makes different API calls internally (webcast API, not the public HTML page) and these do correctly reflect live state.

## How to Apply
```typescript
// _fullConnect() — no SIGI_STATE pre-check:
private async _fullConnect(): Promise<void> {
  if (this.stopped) return;
  console.log(`[TikTok] Connecting to @${this.username}...`);
  await this._connectClient(); // library handles live detection
}

// _connectClient() — handle "not live" from library:
client.on("error", (err) => {
  if (isNotLiveError(err)) {
    // emit "notLive", schedule 30s retry
  } else {
    // emit "wsError", exponential backoff
  }
});
client.connect().catch((err) => {
  if (isNotLiveError(err)) {
    // emit "notLive", schedule 30s retry  
  } else {
    // emit "wsError", exponential backoff
  }
});
```

## isNotLiveError patterns
Must be case-insensitive (`.toLowerCase()`) and cover:
- Own messages: "not currently streaming", "start a tiktok live"
- Library messages: "not started", "no room id found", "status is not",
  "live has ended", "failed to retrieve room", "failed to get room",
  "room not found", "is offline", "not online"

## fetchLiveRoomInfo / SIGI_STATE
The function still exists in the codebase for diagnostics but is NOT called
in the live-connection path. If ever re-enabled, be aware it will always
return `isLive: false` from server IPs.
