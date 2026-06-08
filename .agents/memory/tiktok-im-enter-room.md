---
name: TikTok im_enter_room rejection
description: code=1000 reason="payload_handler_im_enter_room" = Eulerstream's pooled TikTok cookies are stale/rate-limited; fixes and diagnosis notes.
---

**The symptom**: Every WS connection attempt logs `[Pipeline:DISCONNECT] code=1000 (normal closure) | reason="payload_handler_im_enter_room" | rawPacketsReceived=0`. TikTok intentionally closes 700ms after the WS opens.

**What it means**: After `setupWebsocket` opens, `client.switchRooms(roomId)` sends an `im_enter_room` protobuf message. TikTok's `payload_handler_im_enter_room` handler processes it and closes the connection because the TikTok session cookies bundled by Eulerstream are stale or rate-limited from the shared account pool.

**Evidence**: `ws-fallback.eulerstream.com` always returned (never primary) = Eulerstream routing through fallback proxy. Hundreds of failed attempts per hour further exhaust the shared cookie pool.

**Fixes applied**:
1. `connectWithUniqueId: true` in `WebcastPushConnection` options — signs with username instead of roomId, forces a fresh per-username credential lookup at Eulerstream's end rather than reusing cached roomId-based cookies.
2. 120s backoff specifically for `im_enter_room` reason — prevents hammering Eulerstream's pool while it's exhausted.
3. `onBeforeReconnect` DB guard in reconnect loop — stops ghost connectors for ended sessions before they retry.

**How to apply**: If `payload_handler_im_enter_room` reappears after `connectWithUniqueId: true`, the next step is to upgrade the Eulerstream API key tier (paid tier uses dedicated TikTok accounts, not shared pool) or enable `authenticateWs: true` with a real user TikTok session cookie.
