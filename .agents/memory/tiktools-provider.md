---
name: tik.tools provider
description: tik.tools JWT+WebSocket provider for TikTok LIVE events — setup, demo key findings, architecture, and required env vars.
---

# tik.tools Provider

## What it is
Drop-in replacement for the Eulerstream TikTokLiveClient. Uses tik.tools' JWT-authenticated WebSocket API to receive TikTok LIVE events (chat, gift, like, follow, share, roomInfo, member).

## Architecture
- `artifacts/api-server/src/lib/tikToolsClient.ts` — TikToolsClient class, same event interface as TikTokLiveClient
- Factory `createLiveProvider()` in `tiktokConnector.ts` — selects provider based on `LIVE_PROVIDER` env var
- `LIVE_PROVIDER=tiktools` → TikToolsClient; anything else → TikTokLiveClient (Eulerstream)

## Auth flow
1. `POST https://api.tik.tools/authentication/jwt?apiKey=KEY` body `{ allowed_creators: [username], expire_after: 3600, max_websockets: 1 }`
2. Response: `{ status_code: 0, data: { token: "JWT..." } }`
3. WS: `wss://api.tik.tools?uniqueId=USERNAME&jwtKey=TOKEN`

## Demo key findings (tested 2026-06-09)
- Key `your_api_key` is a **real functional key** (not a placeholder)
- HTTP 200 with valid JWT (268 chars) ✓
- WebSocket opens and delivers `roomInfo` event ✓
- **BUT**: shared globally among all demo users → FIFO eviction (code `4429`, reason "Evicted - newer connection arrived (FIFO)") within ~5 seconds
- Not usable for production — any other demo user evicts you

## Required env vars
- `LIVE_PROVIDER=tiktools` (set as shared env var) ✓
- `TIKTOOL_API_KEY=<personal key>` — get free key at https://tik.tools (Community tier: 2,500 req/day, 15 concurrent WS, no credit card)

## Event mapping (tik.tools → TikTokLiveClient interface)
| tik.tools event | Emitted event | Key fields |
|---|---|---|
| chat | chat | user.nickname → username, comment |
| gift | gift | giftName, diamondCount → coins, repeatCount → count |
| like | like | likeCount, totalLikeCount → total |
| follow | social | action="follow" |
| share | social | action="share" |
| member | social | action="join" |
| roomInfo | viewerCount | viewerCount → count |

## Not-live detection
- JWT auth returns error containing "not live" / "not found" → emit `notLive`, poll every 30s
- WS closes within 20s with 0 events → emit `notLive`, poll every 30s
- 60s silence timer → close with reason `silence_timeout` → emit `notLive`, poll every 30s

**Why:** TikTokLiveClient and TikToolsClient must both emit `notLive` so `tiktokConnector.ts` can switch session mode to "not live" and show proper UI feedback without changes to the connector logic.
