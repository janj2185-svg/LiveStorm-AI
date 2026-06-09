---
name: tik.tools provider
description: tik.tools JWT+WebSocket provider for TikTok LIVE events — setup, close codes, diagnostics, and known behaviors.
---

# tik.tools Provider

## Architecture
- `artifacts/api-server/src/lib/tikToolsClient.ts` — TikToolsClient class, same event interface as TikTokLiveClient
- Factory `createLiveProvider()` in `tiktokConnector.ts` — selects provider based on `LIVE_PROVIDER` env var
- `LIVE_PROVIDER=tiktools` → TikToolsClient; anything else → TikTokLiveClient (Eulerstream)

## Auth flow
1. `POST https://api.tik.tools/authentication/jwt?apiKey=KEY` body `{ allowed_creators: [username], expire_after: 3600, max_websockets: 5 }`
2. JWT cached 55 min in-memory; cleared on 4401 rejection
3. WS: `wss://api.tik.tools?uniqueId=USERNAME&jwtKey=TOKEN`

**Why max_websockets:5:** App originally requested 1; fixed. Basic plan allows 5. Always request 5 so multiple sessions can share a JWT.

## JWT payload logging (added)
After every fresh JWT fetch, payload is decoded and logged:
```
[TikTools:jwt-payload] @{user} allowedCreators=[...] maxWebSockets=5 keyHash=... exp=...
```
Lets you verify plan (Basic=5, Community=1 maxWebSockets) without logging the token.

## Pre-flight room_info check (added)
Before every WS connect: `GET /webcast/room_info?uniqueId={user}&apiKey={key}`
- HTTP 404 + `{"status_code":-1,"error":"Not found"}` → creator NOT live (expected, normal)
- HTTP 200 → creator IS live; logs `roomId`, `isLive`, `viewerCount`
- Non-blocking (fail-open) — WS attempt always proceeds regardless of result
- Endpoint discovered via 301 redirect: `/webcast/roomInfo` → `/webcast/room_info`

## Close codes
- `4404` "Creator is not currently live" — explicit tik.tools signal; now emits `notLive` (was falling into silent quick-close retry)
- `4429` — rate limit. Sub-types: daily quota exhausted (23h backoff) vs FIFO eviction (60-300s exponential)
- `4401` — JWT rejected; clears in-memory cache and refetches
- `1000 reason=silence_timeout` — our own 60s watchdog; no events received

## Username format
`@` prefix stripped by constructor. `jan85oks` and `@jan85oks` as `uniqueId` produce identical results — format makes no difference to tik.tools.

## Account (current key)
- Account ID: `8cdd52d8-6608-4b28-9744-2154cf7dafed`
- keyHash: `4775e3100410bb2a`
- Plan: Basic (maxWebSockets=5 confirmed in JWT payload)

## Not-live detection paths
1. JWT auth returns error with "not live" / "not found" → emit `notLive`, retry 30s
2. WS closes code=4404 "Creator is not currently live" → emit `notLive`, retry 30s
3. 60s silence timer with 0 events → close silence_timeout → emit `notLive`, retry 30s
4. Quick transient close (no message, <20s, other codes) → silent retry 30s, no notLive emit
