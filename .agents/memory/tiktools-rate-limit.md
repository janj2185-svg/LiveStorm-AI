---
name: tik.tools sandbox rate limit
description: Free Sandbox plan allows 60 WS connections/hour. Rapid retries exhaust quota, causing zero events. Fix and quota-conservation strategy.
---

## The rule
tik.tools free Sandbox plan hard cap: **60 WebSocket connections per hour** (~1/min budget).  
A JWT is also separately rate-limited; fetching a new one per reconnect burns that limit too.

## Why this matters
If any reconnect loop runs faster than ~1/min, the quota drains in 10–20 minutes.  
After that, every new WS is immediately killed with **code=4429** (< 200ms after open) before any message is received — including `roomInfo`. Since no events ever arrive, the entire event pipeline produces zero output.

## How to apply
In `TikToolsClient._connectAttempt` (`tikToolsClient.ts`):

1. **Detect 4429 in `ws.on("close")`** — dedicated branch before the quick-close check.  
   Backoff: start 60 000 ms, multiply 1.5× on each hit, cap at 300 000 ms (5 min).  
   Reset `rateLimitBackoff` to 60 000 on any non-rate-limited close.

2. **Detect "rate limit" in JWT auth failure** — same exponential backoff, same property.

3. **Cache JWT 55 min** — `cachedJwt: { token, expiresAt }`.  
   Reuse if `expiresAt - 5 min > now`. This drops JWT requests from O(reconnects/hour) to ~1/hour.

4. **Never use 10s quick-close retry** — even non-rate-limited quick-closes should use ≥ 30s.

## Connection state in logs
- `[TikTools:rate-limit]` — 4429 or JWT rate limit hit; shows backoff duration
- `[TikTools] Reusing cached JWT` — JWT cache hit (no network request)
- `[TikTools:raw]` — every WS message with full JSON preview (ring buffer, last 20)
- `GET /api/tiktok/raw-events` — debug endpoint; returns ring buffer (requires auth)
