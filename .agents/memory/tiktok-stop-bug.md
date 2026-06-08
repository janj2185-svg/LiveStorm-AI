---
name: TikTok stopConnection missing
description: stopConnection() was called everywhere but didn't exist — all stop() calls silently threw, ghost sessions reconnected forever.
---

**The bug**: `tiktokConnector.ts` stored `stop: () => client.stopConnection()` in every `activeConnectors` entry. But `TikTokLiveClient` only had `disconnect()` — no `stopConnection()`. Every call to `stop()` threw "client.stopConnection is not a function" silently, leaving reconnect loops running indefinitely.

**Why it was hidden**: The error was swallowed by the arrow function — nothing logged the TypeError. Ghost sessions from previous autoscale instances kept reconnecting across deploys.

**Fix**: Added `stopConnection()` as the canonical stop method (sets `stopped=true`, clears timer, closes WS socket). Made `disconnect()` a deprecated alias that calls `stopConnection()`.

**How to apply**: Any new "stop" method on `TikTokLiveClient` must set `this.stopped = true`. Never call `this.currentClient.disconnect()` without also setting `stopped = true` and clearing `reconnectTimer`.
