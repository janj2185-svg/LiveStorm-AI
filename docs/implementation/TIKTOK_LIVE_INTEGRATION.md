# SYLORA Live Platforms — multi-platform architecture

Date: 2026-08-01  
Branch: `cursor/sylora-live-platforms-5b96`

## Layout

TikTok is **not** a top-level isolated module. All streaming platforms live under:

```
services/api/app/live_platforms/
  common/          # shared contracts (platform-agnostic names)
  tiktok/          # TikTok-specific adapter
  youtube/         # independent package slot
  twitch/
  facebook/
  instagram/
  discord/
  obs/
```

## Status (TikTok)

**BLOCKED_BY_PROVIDER_ACCESS** (`LivePlatformIntegrationStatus`)

Not READY. No real TikTok LIVE connection was validated. Automated tests use `FakeTikTokTransport` only.

### Official access research (2026-08-01)

Reviewed TikTok for Developers public surface (Login Kit, Share Kit, Display API, Content Posting API, Research API). **No official third-party LIVE chat/gift/follow event API** suitable for co-host ingestion was found in the public docs index.

Commercial unofficial webcast proxies exist but rely on reverse-engineered private transports. Per product requirements they are **not** shipped as production transports.

## Architecture

```
LivePlatformAuthProvider ──┐
LivePlatformTransport ─────┼─► LivePlatformConnectionManager ─► LiveEventNormalizer
rate limit / backoff /     │            │
dedupe / circuit / metrics ┘            ▼
                               NormalizedLiveEvent
                                        │
                                        ▼
                           hub_bridge.to_adapter_inbound
                                        │
                                        ▼
                           LiveEventHub / LiveNormalizedEvent
                                        │
                                        ▼
                DialogueScheduler + CoHostMemory + SafetyPolicy  (common/)
                                        │
                                        ▼
             CoHostOutputOrchestrator → TTS / Avatar / OBS / Gift Runtime
```

New platforms plug in by implementing auth + transport + normalizer and emitting
`NormalizedLiveEvent` into the same hub. **AI Co-Host, TTS, Avatar, OBS, and
LiveEventHub do not need changes** for a new platform package.

### Shared contracts (`live_platforms/common/`)

| Module | Responsibility |
|---|---|
| `interfaces.py` | `LivePlatformAdapter`, `LivePlatformTransport`, `LivePlatformAuthProvider`, `LiveEventNormalizer`, `LiveConnectionManager` / `LivePlatformConnectionManager`, credential request types |
| `events.py` | `NormalizedLiveEvent`, `NormalizedLiveEventType`, `LivePlatformConnectionState` |
| `status.py` | `LivePlatformIntegrationStatus`, `LivePlatformStatus`, `LivePlatformId` |
| `credentials.py` | `LivePlatformCredentials` |
| `errors.py` | Structured `LivePlatformError*` hierarchy |
| `metrics.py` | `LivePlatformMetrics` counters/gauges |
| `reliability.py` | Backoff, rate limit, circuit breaker, dedupe, DLQ, health |
| `connection.py` | `LivePlatformConnectionManager` loop |
| `hub_bridge.py` | Map into `AdapterInboundEvent` |
| `memory.py` / `cohost.py` / `output.py` | Platform-agnostic Co-Host stack |

### TikTok package (`live_platforms/tiktok/`)

| Module | Responsibility |
|---|---|
| `status.py` | TikTok current status + limitation text |
| `auth.py` | Blocked + approved-provider auth seams |
| `transport.py` | Blocked transport; approved stub; **FakeTikTokTransport (tests only)** |
| `normalizer.py` | TikTok payload → `NormalizedLiveEvent` |
| `adapter.py` | `TikTokLiveAdapter` for `AdapterRegistry` |

TikTok-local aliases (e.g. `TikTokEventType = NormalizedLiveEventType`) may exist
only inside `tiktok/`. Shared modules must not use TikTok-named classes.

### Other platforms

`youtube/`, `twitch/`, `facebook/`, `instagram/`, `discord/`, `obs/` currently
expose independent stub packages. Existing production YouTube/Twitch/Discord/OBS
paths in `live_adapters.py` are unchanged; these packages are extraction slots
so new work lands under `live_platforms/` without hub rewrites.

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

Each `NormalizedLiveEvent` includes: `eventId`, `source`, `type`, `timestamp`, `roomId`, `userId`, `username`, `displayName`, `payload`, `rawProviderEvent`, `deduplicationKey`, `sequenceNumber`, `confidence`, `providerLatencyMs`.

## Tests

- `services/api/tests/test_tiktok_live.py` — TikTok adapter + reliability + co-host
- `services/api/tests/test_live_platforms.py` — imports, common contract names, stub slots, hub routing

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

## What the owner must provide

1. Written confirmation of an **approved** TikTok LIVE event source (official partner API **or** contracted provider SYLORA legal accepts).
2. Provider endpoint + credentials in secret manager (`TIKTOK_LIVE_PROVIDER_*`).
3. Set `TIKTOK_LIVE_PROVIDER_APPROVED=true` only after legal/product sign-off.
4. Wire a concrete transport client into `ApprovedProviderTransportStub` (no scraping).
5. Run a real LIVE session and capture non-secret evidence for READY promotion.

## Honest status label

**BLOCKED_BY_PROVIDER_ACCESS**
