# SYLORA TikTok LIVE — architecture & honest status

Date: 2026-08-01  
Branch: `cursor/sylora-tiktok-live-adapter-5b96`

## Status

**BLOCKED_BY_PROVIDER_ACCESS**

Not READY. No real TikTok LIVE connection was validated. Automated tests use `FakeTikTokTransport` only.

### Official access research (2026-08-01)

Reviewed TikTok for Developers public surface (Login Kit, Share Kit, Display API, Content Posting API, Research API). **No official third-party LIVE chat/gift/follow event API** suitable for co-host ingestion was found in the public docs index.

Commercial unofficial webcast proxies (tik.tools, Eulerstream, open-source webcast scrapers) exist but rely on reverse-engineered private transports / signing. Per product requirements they are **not** shipped as production transports.

## Architecture

```
TikTokAuthProvider ──┐
TikTokTransport ─────┼─► TikTokConnectionManager ─► TikTokEventNormalizer
TikTokRateLimiter ───┤            │
TikTokReconnectMgr ──┤            ▼
TikTokHealthMonitor ─┘   TikTokNormalizedEvent
                              │
                              ▼
                     hub_bridge.to_adapter_inbound
                              │
                              ▼
                     LiveEventHub / LiveNormalizedEvent
                              │
                              ▼
              DialogueScheduler + CoHostMemory + SafetyPolicy
                              │
                              ▼
           CoHostOutputOrchestrator → TTS / Avatar / OBS / Gift Runtime
```

### Modules created (`services/api/app/tiktok_live/`)

| Module | Responsibility |
|---|---|
| `interfaces.py` | TikTokTransport, AuthProvider, EventNormalizer, ConnectionManager, RateLimiter, HealthMonitor, ReconnectManager |
| `status.py` | Honest status enum + adapter limitation text |
| `events.py` | Canonical event types + normalized event fields |
| `auth.py` | Blocked + approved-provider auth seams |
| `transport.py` | Blocked transport; approved stub; **FakeTikTokTransport (tests only)** |
| `normalizer.py` | Provider payload → TikTokNormalizedEvent (secret scrubbing) |
| `reliability.py` | Backoff, rate limit, circuit breaker, dedupe, DLQ, health |
| `connection.py` | Connection manager loop + graceful shutdown |
| `hub_bridge.py` | Map into `AdapterInboundEvent` |
| `memory.py` | Short-term / user / topic / gift / summary memory + TTL |
| `cohost.py` | Dialogue scheduler + personality profiles + hard safety |
| `output.py` | TTS interrupt, avatar, OBS, gift sync plan |
| `adapter.py` | `TikTokLiveAdapter` for `AdapterRegistry` |

### Live Studio control panel

- API: `GET /v1/live/tiktok/control-panel`
- Flutter: `_TikTokLiveControlPanel` on Live Studio

### Config (no secrets committed)

```
TIKTOK_LIVE_PROVIDER_APPROVED=false
TIKTOK_LIVE_PROVIDER_NAME=
TIKTOK_LIVE_PROVIDER_API_KEY=
TIKTOK_LIVE_PROVIDER_ENDPOINT=
```

## Supported event types (normalized)

`connected`, `disconnected`, `chat_message`, `like`, `gift`, `gift_streak`, `follow`, `share`, `subscribe`, `viewer_join`, `viewer_leave`, `room_statistics`, `moderation`, `stream_ended`, `reconnect`, `provider_error`

Each normalized event includes: `eventId`, `source`, `type`, `timestamp`, `roomId`, `userId`, `username`, `displayName`, `payload`, `rawProviderEvent`, `deduplicationKey`, `sequenceNumber`, `confidence`, `providerLatencyMs`.

## Tests

`services/api/tests/test_tiktok_live.py` covers:

- blocked auth/transport
- fake transport forbidden outside tests
- normalization + secret scrubbing
- dedupe / backoff / rate limit / circuit breaker
- connection manager with fake events
- dialogue scheduling (host interrupt, gifts, mute, toxicity)
- TTS interrupt + output sync
- chat burst load smoke

Fake events are **not** production proof.

## Real LIVE validation (required for READY)

Missing / blocked:

| Gate | State |
|---|---|
| Official or contracted approved provider | Missing |
| Real connect | Not possible |
| Real chat / like / gift | Not observed |
| Hub ingest of real events | Not observed |
| AI reply + TTS + avatar + OBS on real gift | Not observed |
| Network reconnect proof | Not observed |

### Metrics (real run)

| Metric | Value |
|---|---|
| latency | n/a |
| reconnect time | n/a |
| event loss | n/a |
| duplicate count | n/a (test-only dedupe verified) |
| AI response latency | n/a |
| TTS latency | n/a (null synthesizer in unit tests only) |

## What the owner must provide

1. Written confirmation of an **approved** TikTok LIVE event source (official partner API **or** contracted provider SYLORA legal accepts).
2. Provider endpoint + credentials in secret manager (`TIKTOK_LIVE_PROVIDER_*`).
3. Set `TIKTOK_LIVE_PROVIDER_APPROVED=true` only after legal/product sign-off.
4. Wire a concrete transport client into `ApprovedProviderTransportStub` (no scraping).
5. Run a real LIVE session and capture non-secret evidence for READY promotion.

## Honest status label

**BLOCKED_BY_PROVIDER_ACCESS**
