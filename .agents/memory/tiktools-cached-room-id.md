---
name: TikTools cachedRoomId stale room bug
description: Root cause and fix for WS connecting to dead old room when creator starts a new live session.
---

## The Bug

In `_fetchRoomInfo` (tikToolsClient.ts), the condition to update `this.cachedRoomId` was:
```typescript
if (roomId && roomId !== "unknown" && !this.cachedRoomId) {
```

The `!this.cachedRoomId` guard meant: once any roomId was set (from the first WS `roomInfo` event), it was NEVER updated again from the REST API. When a creator ends a live session and starts a new one, the new session gets a new roomId. The REST API returned the new roomId but `cachedRoomId` still held the old dead room's ID. The WS connected to the old room — receiving only stale system init events (shareRevenueNotice, giftDynamicRestriction, fanTicket, etc.) with zero viewer events.

**Symptom**: `alive=true` from REST API, but only system events arrive over WS, no member/like/chat/gift events.

## The Fix

Remove the `!this.cachedRoomId` guard. Always update from the REST API:
```typescript
if (roomId && roomId !== "unknown") {
  if (this.cachedRoomId && this.cachedRoomId !== roomId) {
    console.log(`[TikTools:room_info] @${username} → roomId CHANGED ${old} → ${new} — updating cache`);
  }
  this.cachedRoomId = roomId;
}
```

**Why:** The REST API always has the freshest roomId for the creator's current live session. The WS `roomInfo` event only reflects whatever room was connected to. Order of operations: `_fetchRoomInfo` → update `cachedRoomId` → WS connects using the fresh roomId → WS `roomInfo` confirms the same roomId.

## How to Apply

Any time a creator reports "app not detecting my live stream" — check logs for this pattern:
- `room_info → roomId=X alive=true`
- `ws-url → connecting with roomId hint Y` (where Y ≠ X)

If Y ≠ X, this bug is the cause. Confirmed fix: the REST API room_id must always win.
