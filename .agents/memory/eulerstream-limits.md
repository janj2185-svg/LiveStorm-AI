---
name: Eulerstream free tier limits
description: eulerstream's anonymous fallback disconnects immediately; a SIGN_API_KEY env var unlocks sustained connections; rapid reconnects trigger per-minute rate limits.
---

## The Rule
`tiktok-live-connector@2.1.1-beta1` uses eulerstream (`https://tiktok.eulerstream.com`) to sign WebSocket URLs. Without a `SIGN_API_KEY` env var:
- Anonymous fallback connects briefly, then disconnects (code 1006) immediately.
- After ~5–10 rapid reconnects, eulerstream's rate limit fires: `(rate_limit_account_minute) Too many connections started`.
- No TikTok events (chat, gift, like, etc.) flow through the anonymous tier.

**Why:** eulerstream monetizes signing. The free anonymous tier acts as a demo/teaser that establishes the connection but terminates it before events flow.

## How to apply
- Set `SIGN_API_KEY` environment variable to a eulerstream API key (free tier available at https://eulerstream.com/pricing).
- The connector reads this via `tiktok-live-connector`'s built-in `SIGN_API_KEY` env var support.
- With a valid key, the WebSocket stays open and real TikTok events (chat, gift, like, follow, share, viewer count) flow through.

## Rate limit recovery
The per-minute rate limit clears on its own after ~1–2 minutes. The reconnect loop uses exponential backoff (3s → 4.5s → 6.8s → 10.1s → 15.2s → 30s max) so it recovers gracefully.

## Friendly error message
The rate limit error is surfaced to the user as:
> "Eulerstream rate limit reached — too many connection attempts. Sign up for a free API key at https://eulerstream.com/pricing and set SIGN_API_KEY in your server environment for stable, sustained connections."
