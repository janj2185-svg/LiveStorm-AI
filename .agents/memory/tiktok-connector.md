---
name: TikTok connector architecture
description: Custom pbf+ws TikTok LIVE connector replacing tiktok-live-connector; protobufjs blocked on Replit; field numbers; connection flow.
---

## Rule
`protobufjs` is **entirely blocked** by Replit's supply-chain security firewall — ALL versions (6.x and 7.x). `tiktok-live-connector` cannot be installed on Replit because it depends on protobufjs.

`TIKTOK_MODE=demo` (default) → simulator always runs, no real TikTok.
`TIKTOK_MODE=real` → real connector attempted; if it fails, exact error emitted via `tiktok:status` socket event and surfaced in UI — **no silent fallback**.

**Why:** Silent fallback to demo masked connectivity failures. protobufjs blocked at npm registry proxy level by Replit.

## Solution: custom connector (pbf + ws)
Three files implement the replacement (do not reinstall tiktok-live-connector):
- `artifacts/api-server/src/lib/tiktokProto.ts` — protobuf decoders using `pbf` v5 `PbfReader`
- `artifacts/api-server/src/lib/tiktokLiveClient.ts` — `TikTokLiveClient` EventEmitter (fetch + ws + zlib)
- `artifacts/api-server/src/lib/tiktokConnector.ts` — public API wiring to socket/session system

## pbf v5 import pattern
```typescript
import { PbfReader } from "pbf"; // named export, NOT default
```
`pbf.readFields(fn, init)` and `pbf.readMessage(fn, init)` — unknown fields auto-skipped.
Both `pbf` and `ws` are **bundled** by esbuild (not external). `tiktok-live-connector` removed from esbuild externals entirely.

## Connection flow (3 steps)
1. `GET https://www.tiktok.com/@{username}/live` → regex `/"roomId":"(\d+)"/` → roomId
2. `GET https://webcast.tiktok.com/webcast/room/info/?room_id={id}&aid=1988` → verify `data.status === 4`
3. `GET https://webcast.tiktok.com/webcast/im/fetch/?...` → decode WebcastResponse protobuf → cursor + wsParam → `wss://webcast.tiktok.com/ws/` URL

## Key protobuf field numbers
- **WebcastResponse**: 1=repeated WebcastMessage, 2=cursor, 7=wsParam{1=name,2=value}, 9=needAck, 10=internalExt
- **WebcastMessage**: 1=method, 2=payload, 3=msgId
- **TikTokUser**: 3=nickname, 38=uniqueId
- **Chat**: 2=user, 3=comment
- **Gift**: 2=user, 9=repeatCount, 10=repeatEnd, 15=GiftStruct{5=diamondCount,16=name}
- **Like**: 2=count, 3=total, 5=user
- **Social**: 2=user, 8=displayType
- **Member**: 2=user, 10=actionId (1=join, 6=follow)
- **RoomUserSeq**: 3=viewerCount

## Socket event schema
`tiktok:status { mode: "real" | "demo" | "error", error?: string, username?: string }`

## Other API surface
- `GET /api/sessions/active` returns `mode` and `connectionError` for page-refresh persistence
- `POST /api/tiktok/test-connection` tests a username without starting a session

## TikTok API reachability on Replit (confirmed June 2026)
- `https://www.tiktok.com/@{username}/live` ✅
- `https://webcast.tiktok.com/webcast/room/info/` ✅
- `https://webcast.tiktok.com/webcast/im/fetch/` ✅
- `wss://webcast.tiktok.com/ws/` — requires active live stream for cursor/wsParam to be non-empty
