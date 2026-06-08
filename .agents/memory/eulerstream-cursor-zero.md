---
name: Eulerstream proxy cursor="0" — plan limitation
description: Eulerstream fetchWebcastURL returns cursor="0" on current plan; proxy delivers zero bytes to TikTok LIVE WebSocket.
---

## The rule
When `fetchWebcastURL` returns `cursor="0"` in `internalExt`, Eulerstream's ws-fallback proxy has failed to authenticate with TikTok. The proxy accepts our WebSocket connection but relays zero bytes — confirmed by 90s test with active TikTok LIVE room (`@jan85oks`, roomId `7649158110296263456`, status=2).

**Why:** Eulerstream's current plan does not include real TikTok session/cookie management. A valid cursor requires Eulerstream to hold authenticated TikTok cookies server-side (Business plan feature). Without it, TikTok rejects the proxy's `im_enter_room` silently.

**How to apply:**
- `cursor="0"` in wsParams = proxy auth failure; do NOT retry rapidly (burns quota).
- The 60s silence timeout in `tiktokLiveClient.ts` (switchRooms no-op path) catches this and schedules a 60s retry via `_scheduleRetry(60_000, true)`.
- Fix requires either: (a) Eulerstream Business plan upgrade, or (b) alternative provider.

## Symptoms
- `fetchWebcastURL` → `{ cursor: "0", internalExt: "" }` (empty)
- `client_enter: "true"` in wsParams (proxy claims to handle room entry)
- Connection stays open for 60s+ with heartbeats but ZERO bytes received
- No `decodedData`, `websocketData`, `chat`, `roomUser`, or any events

## Confirmed working (plan available)
- `fetchWebcastURL` → 200 (returns WS URL + JWT token, but cursor="0")
- `getRateLimits` → 200 (day: 1000/day limit; 46 remaining after 2026-06-08 testing)

## Confirmed NOT working (plan restriction)
- `retrieveBulkLiveCheck` → 401 (Business plan)
- `retrieveRoomInfo` → 401 (Business plan)
- `connectWithUniqueId` → 404
- `useMobile: true` → 400
- `/webcast/sign`, `/webcast/connect` → 404 (routes don't exist)

## Path forward
1. Upgrade Eulerstream to Business plan → unlocks real cursor management
2. Or switch to TikTok's official Live Interaction API (creator partnership required)
3. Or use TikAPI / another provider
