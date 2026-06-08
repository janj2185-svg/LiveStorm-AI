---
name: TikTok LIVE event delivery bugs
description: All bugs found in the event delivery pipeline (chat/like/gift/follow/share not appearing in UI)
---

## The Rule
The library emits `"follow"` and `"share"` as **separate direct events**, NOT through `"social"`.
Always listen to `client.on("follow")`, `client.on("share")`, AND `client.on("social")`.

## Library Event Routing (confirmed from events.js)

```javascript
// WebcastSocialMessage → library splits into 3 events:
case 'WebcastSocialMessage':
    if (displayType.includes('follow')) return this.emit("follow", data);
    if (displayType.includes('share'))  return this.emit("share", data);
    return this.emit("social", data);

// All other events go via WebcastEventMap default:
'WebcastChatMessage'     → "chat"
'WebcastLikeMessage'     → "like"
'WebcastGiftMessage'     → "gift"
'WebcastMemberMessage'   → "member"
'WebcastRoomUserSeqMessage' → "roomUser"
```

## Reconnect Timing (anonymous Eulerstream tier)

- Anonymous tier disconnects with code=1006 frequently (rate-limited signed URLs)
- Initial reconnect: **15s** (was 3s — caused immediate rate limit spam)
- Cap: **60s** (was 30s)
- Backoff: 15s → 22.5s → 33.8s → 50.6s → 60s
- Rate limit detected in `on("error")`: force `reconnectDelay = 60_000`

## Field Names (v2 schema)

- Chat: `d?.comment ?? d?.content` (primary is `comment`)
- Username: `d?.uniqueId ?? d?.user?.uniqueId ?? d?.userDetails?.user?.uniqueId`
- Gift coins: `d?.diamondCount ?? d?.gift?.diamondCount`

## Logging Chain (production trace)

```
[TikTok] RawEvent type=WebcastChatMessage @username        ← decodedData handler
[TikTok] chat @username ← viewer: "message"               ← chat handler
[TikTok] ▶ comment → session 53: viewer: "message"        ← tiktokConnector
[Socket] live:event type=comment → room=session:53         ← socketServer
```

If `RawEvent` never appears: WebSocket open but no data flowing (1006 disconnect before messages).
If `chat` log appears but `▶ comment` does not: event handler on TikTokLiveClient not wiring up.
If `▶ comment` appears but no UI: Socket.IO room join issue on frontend.

## The Remaining Blocker (as of 2026-06-08)

Anonymous Eulerstream tier (no SIGN_API_KEY) disconnects in <10s with code=1006.
Events likely never arrive in that window. SIGN_API_KEY is required for sustained connections.
