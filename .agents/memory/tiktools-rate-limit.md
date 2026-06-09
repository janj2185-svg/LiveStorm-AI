---
name: tik.tools sandbox rate limit
description: Community plan has TWO distinct 4429 sub-types with very different handling. Daily session quota exhaustion must be detected and backed off 23h, not retried.
---

## The rule
tik.tools free **Community** plan hard caps:
- **15 WebSocket sessions per 24 hours** — each connection open (including reconnects after eviction/disconnect) consumes one slot.
- JWT is separately rate-limited; cache it 55 min to avoid burning JWT quota on every reconnect.

## Two distinct 4429 sub-types — handle differently

### A) Daily session quota exhausted
```
reason="Daily Demo Limit Reached. Upgrade Required. (15 WS sessions / 24h on Community)"
```
Detected by: `reason.includes("daily") || reason.includes("limit reached") || reason.includes("upgrade required")`

**Action**: Back off **23 hours**. Every retry burns another slot — do NOT retry within the same 24h window. Log at `console.error` with `[TikTools:daily-limit]`.

### B) FIFO eviction (newer connection displaced ours)
```
reason="Evicted - newer connection arrived (FIFO)"
```
Caused by: dev server + prod server both connecting simultaneously, or two browser tabs.

**Action**: Exponential backoff starting 60s → cap 5 min. Log at `console.warn` with `[TikTools:rate-limit]`.

## Why this matters
The old code treated both sub-types identically with a 90s exponential backoff. When the daily cap was hit, every retry burned another slot, caused an immediate 4429, and scheduled another retry — draining the remaining quota in minutes and locking out the account for the day.

## How to apply
In `TikToolsClient._connectAttempt` (`tikToolsClient.ts`), in the `ws.on("close")` handler for `code === 4429`:

1. Check `isDailyLimit` first → 23h backoff.
2. Else (FIFO eviction) → exponential 60s→300s backoff.
3. Cache JWT 55 min — `cachedJwt: { token, expiresAt }` — reuse if `expiresAt - 5 min > now`.

## Startup diagnostic logging added
`tiktokConnector.ts` now logs all three provider-selection env vars at module load:
```
[Env:startup] TIKTOK_MODE="real" isRealModeEnabled=true | LIVE_PROVIDER="tiktools" | TIKTOOL_API_KEY="tk_5a0...91bda8" len=51 startsWithTk=true
```
Followed by warnings if any of the three is misconfigured.

Per-connection diagnostic logs in `tikToolsClient.ts`:
- `[TikTools:key]` — API key fingerprint (first 6 + last 6 chars, length, startsWithTk)
- `[TikTools:ws-url]` — WebSocket URL with jwtKey first 12 chars + `...[masked]`

## Upgrade path
To exceed 15/day: upgrade to tik.tools Pro (~$7/week) — 50 WS sessions per 8 hours.
