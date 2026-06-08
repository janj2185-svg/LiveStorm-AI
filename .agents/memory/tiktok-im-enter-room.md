---
name: TikTok im_enter_room diagnostic findings
description: Root cause and fix for payload_handler_im_enter_room disconnect on Eulerstream ws-fallback
---

## Root cause (confirmed 2026-06-08)

`code=1000, reason="payload_handler_im_enter_room"` with `rawPacketsReceived=0` means the TikTok user is **not currently live**. It does NOT indicate a rate-limit or cookie issue.

## Evidence chain

- `cursor="0"` (len=1) from `fetchSignedWebSocketFromEuler` → Eulerstream cannot get a real cursor → room is offline
- `fetchIsLive() = false` → library confirms user not live
- TikTok HTML `liveRoomStatus: 0` → SIGI_STATE confirms offline
- TikTok live detail API → `status_code: 10201` (room not found/offline)
- WebcastSystemMessage decodes to "Connected through Euler Stream fallback proxy" — this is normal/informational
- Patching `switchRooms()` to skip `im_enter_room` send had NO effect → Eulerstream's proxy sends its own `im_enter_room` to TikTok; TikTok closes when the room is offline

## Eulerstream plan limitations (current key)

- `connectWithUniqueId: true` → 404 "Route '/webcast/fetch' DNE" (not supported on current plan)
- `useMobile: true` → 400 error (higher plan required)
- `fetchRoomIdFromEuler` → 401 "requires Business plan"
- Current plan only supports `fetchWebcastURL` with `roomId`

## Fix applied

1. `connectWithUniqueId: true` removed from `WebcastPushConnection` options — causes 404 SignAPIError
2. `disconnected` handler: `im_enter_room` + `rawEventCount === 0` → emit `notLive` + poll 30s (same as other offline cases)
3. `im_enter_room` + `rawEventCount > 0` → still 120s backoff (Eulerstream pool exhausted mid-stream)
4. `client.disconnect()` → `client.stopConnection()` in catch blocks

## How to apply

When seeing `payload_handler_im_enter_room` in logs with `rawPacketsReceived=0`:
- User is simply not live. Stop hammering. Wait for them to go live.
- When `rawPacketsReceived > 0` with same reason: Eulerstream mid-session issue, back off 120s.
