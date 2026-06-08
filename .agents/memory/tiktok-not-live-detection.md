---
name: TikTok not-live detection
description: How to correctly detect that a TikTok user is not currently streaming, and what signals are reliable.
---

## The rule
When TikTok's `room/info` API is called for a user who is NOT broadcasting:
- Returns `{"data": {}, "status_code": 0}` — `data` is an empty object, NOT `null` and NOT `{status: 0}`.
- The `status` field is completely absent from `data` when not live.
- `status === 4` only appears when the room IS actively streaming.

## Why this caused a bug
`verifyRoomIsLive` checked `body?.data?.status !== undefined && status !== 4`.
When `status` is `undefined` (field absent), the condition is `false` and the check silently passes.
Fix: treat `Object.keys(data).length === 0` as "not live" and throw before checking status.

## im/fetch behavior
`webcast/im/fetch` always returns `status: 200` with `body length: 0` when the user is not live.
This is true even with cookies (ttwid, tt_chain_token, msToken) carried from the live page.
The empty body means no cursor/wsParam → no `imprp` → WebSocket returns HTTP 404 Not Found.

**How to apply:** Any code that calls `im/fetch` and gets 0 bytes must treat it as "not streaming",
not as a parse error or auth failure. The correct response is to surface a user-friendly message
and poll `verifyRoomIsLive` every 30 s until the user goes live.
