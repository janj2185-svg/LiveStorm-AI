# LiveStorm → SYLORA TikTok LIVE migration audit

Date: 2026-08-01  
Branch of record: `cursor/sylora-tiktok-audit-5b96`  
Source of old code: `origin/main` (`artifacts/api-server`, `artifacts/livestorm-ai`)  
Verdict: **NOT READY — do not migrate as a working TikTok LIVE integration**

## Executive verdict

| Question | Answer |
|---|---|
| Does old LiveStorm TikTok LIVE code exist? | Yes — on `main` only; not checked out on SYLORA branches |
| Does it work for real LIVE events in this environment? | **No** |
| Were simulators used as proof? | **No** (explicitly rejected) |
| Can we show chat → AI → TTS → avatar from TikTok? | **No** — blocked before chat ingest |
| Should modules be copied into SYLORA as READY adapters? | **No** |

Status label: **BLOCKED_BY_MISSING_LIVE_STREAM_AND_PROVIDER_CREDENTIALS**  
(Also constrained by SYLORA policy: unofficial TikTok webcast scraping is not an approved platform adapter.)

---

## Exact failure (real probe, no simulator)

Target account used by LiveStorm diagnostics: `@jan85oks`.

### 1) `tiktok-live-connector@2.1.1-beta1`

```json
{
  "ok": false,
  "error_message": "The requested user isn't online :(",
  "error_name": "Error",
  "info": null,
  "exception": null
}
```

Log: `/opt/cursor/artifacts/tiktok-audit/connector-offline-detail.log`

### 2) LiveStorm-compatible `webcast/im/fetch`

```
im_fetch_http 200 bytes 0 content-type application/json
RESULT: empty body => LiveStorm docs treat as NOT STREAMING (no cursor/wsParam)
```

Log: `/opt/cursor/artifacts/tiktok-audit/im-fetch-probe.log`

### 3) Misleading HTML / room_info cache

- `GET https://www.tiktok.com/@jan85oks/live` returned HTML with `"roomId":"7668797701496032033"` and `"status":4`
- `GET webcast/room/info` also returned `status: 4` with a populated `data` object
- LiveStorm memory docs already warn that cached page status is **not** sufficient; empty `im/fetch` means no WS cursor

Conclusion: page metadata looked “live”, but the webcast ingest path required for chat/gifts was empty → **no real events**.

### 4) Credentials present in this agent environment

| Variable | Status |
|---|---|
| `TIKTOK_MODE` (leftover `/workspace/.env`) | `demo` (simulator mode — not used for proof) |
| `LIVE_PROVIDER` | absent |
| `TIKTOOL_API_KEY` | absent |
| `SIGN_API_KEY` / `SIGN_API_URL` | absent |

Without an active LIVE + provider key (tik.tools) or a working Eulerstream path against a real stream, migration cannot be verified.

Evidence image: `/opt/cursor/artifacts/tiktok-audit/00-tiktok-probe-failed.png`

Reproduce:

```bash
./scripts/probe-tiktok-legacy.sh jan85oks
```

---

## Inventory: old LiveStorm modules (`origin/main`)

### TikTok LIVE / chat / gifts / likes / follows / viewers

| Module | Path | Role | Probe status |
|---|---|---|---|
| Connector router | `artifacts/api-server/src/lib/tiktokConnector.ts` | Mode switch demo/real; wires events into Socket.IO | Real mode not proven here |
| Euler / library client | `artifacts/api-server/src/lib/tiktokLiveClient.ts` | Unofficial webcast client | Offline for test user |
| tik.tools client | `artifacts/api-server/src/lib/tikToolsClient.ts` | Paid/3rd-party WS proxy | **No API key** in env |
| Protobuf helpers | `artifacts/api-server/src/lib/tiktokProto.ts` | Custom pbf decode (Replit workaround) | Orphaned relative to current wrapper |
| Simulator | `artifacts/api-server/src/lib/tiktokSimulator.ts` | Fake comments/gifts/likes | **Forbidden as proof** |
| HTTP routes | `artifacts/api-server/src/routes/tiktok.ts` | test-connection / diagnostics | Not run as SYLORA service |
| CLI diag | `artifacts/api-server/diag-tiktok-live.mjs` | Live page SIGI dump | Ran; misleading status=4 |

### Event bus / WebSocket

| Module | Path | Role |
|---|---|---|
| Socket.IO bus | `artifacts/api-server/src/lib/socketServer.ts` | `ingestLiveEvent`, rooms `session:{id}`, emits `live:event` / `tiktok:status` / `ai:announcement` |
| Client hook | `artifacts/livestorm-ai/src/hooks/useLiveSession.ts` | Consumes Socket.IO feed + TTS queue |

### AI Co-Host / chat intelligence

| Module | Path | Role |
|---|---|---|
| Orchestrator | `artifacts/api-server/src/agents/agentOrchestrator.ts` | Priority queue, TTS cooldowns, gift/follow/chat routing |
| Host agent | `artifacts/api-server/src/agents/hostAgent.ts` | LLM replies; nicknames; laugh/joke/intent short-circuits |
| Chat agent | `artifacts/api-server/src/agents/chatAgent.ts` | Classify / prioritize comments |
| Memory / recognition | `memoryAgent.ts`, `viewerFactExtractor.ts`, `recognitionEngine.ts` | Per-viewer context |
| Emotion / mood / behavior | `emotionEngine.ts`, `moodEngine.ts`, `behaviorEngine.ts` | Timing, barge-in friendly behavior, gift velocity |
| Moderation / personality / voice | `moderationAgent.ts`, `personalityAgent.ts`, `voiceAgent.ts` | Safety + persona + voice catalog |

### TTS / mic / avatar / OBS

| Module | Path | Role |
|---|---|---|
| TTS API | `artifacts/api-server/src/routes/ai.ts` (`generateVoice`) | OpenAI-compatible TTS |
| Mic / STT | `routes/mic.ts`, `useWhisperMic.ts`, `useStreamerMic.ts` | Hear the host |
| Avatar API + VRM UI | `routes/avatar.ts`, `components/avatar/*`, `useAvatarReactions.ts`, `useLipSync.ts` | Avatar reacts to speech/gifts |
| OBS overlays | `routes/obs.ts`, `pages/obs/*`, `useObsSocket.ts` | Browser sources / alerts |

---

## What already exists in SYLORA (do not reinvent)

| Capability | SYLORA location | Status |
|---|---|---|
| Live Event Hub / normalized events | `services/api/app/live_service.py` (`LiveEventHub`) | Present |
| Platform adapters | `services/api/app/live_adapters.py` | YouTube/Twitch/Discord/OBS/MediaMTX/Plugin |
| TikTok adapter | `UnavailablePlatformAdapter(..., "requires_provider_review")` | **Unavailable by design** |
| AI live personas / turns / `respond_voice` | `live_models.py`, `live_service.py`, `ai_providers.py` | Contracts present; voice when OpenAI keyed |
| First-party gift WS | `routers/gifts.py`, `packages/gift-runtime` | Present (SYLORA gifts, not TikTok) |
| OBS companion | `services/companion` | Present |
| Policy | `docs/implementation/EXTERNAL_CAPABILITIES.md` | Unofficial TikTok LIVE scraping disallowed |

Admin platform snapshot (2026-08-01):

```json
{
  "platform": "tiktok",
  "available": false,
  "status": "requires_provider_review",
  "capabilities": [],
  "limitation": "An approved official provider endpoint, credentials, scopes, and explicit capability grant are required. Scraping and unofficial transports are not used."
}
```

---

## Migration decision (honest)

### Not migrated (and why)

1. **TikTok webcast connector / tik.tools / simulator** — real LIVE ingest not proven; credentials missing; SYLORA policy rejects unofficial scraping as a product adapter.
2. **LiveStorm Socket.IO TikTok event bus** — superseded by SYLORA `LiveEventHub` + `/v1/ws/live/{session_id}`; copying would fork two buses.
3. **VRM avatar React stack** — large LiveStorm UI; SYLORA does not yet have an equivalent runtime surface to attach without a separate avatar provider decision.
4. **Co-host agent TypeScript monolith** — tightly coupled to LiveStorm DB (`streamersTable`, Clerk) and `TikTokEvent` types including simulator imports.

### Eligible later (only after gates)

Port as **independent adapters** into SYLORA only when all are true:

1. Owner is **actually LIVE** (non-empty `im/fetch` / connector online) **or** official TikTok LIVE partner API is approved.
2. Provider credentials stored server-side (`TIKTOOL_API_KEY` or official OAuth/scopes).
3. Adapter registers into `AdapterRegistry` with explicit capability grants (never silent demo fallback).
4. Events map into `LiveNormalizedEvent` → existing `LiveEventHub`.
5. Co-host rules (nickname address, barge-in, gift/like/follow priorities, TTS cooldowns) reimplemented against SYLORA personas/`respond_voice` — **behavior port**, not file copy.
6. Real evidence captured: TikTok connect, real chat line, AI text, TTS audio, avatar reaction, gift reaction — **no fake events**.

---

## Required AI Co-Host behaviors vs current proof

| Behavior | LiveStorm source | Proven on TikTok today? |
|---|---|---|
| Hear host (STT) | mic routes / Whisper hooks | Not tested in this audit (blocked earlier) |
| Read TikTok chat | connector → orchestrator | **No — no chat events** |
| Reply to named viewers | `hostAgent` + memory | Not reachable |
| Remember context | `memoryAgent` | Not reachable |
| Questions / jokes / laughs / teases | intent classifier in `hostAgent` | Not reachable |
| React to gifts/likes/follows/joins | orchestrator priorities | **No** |
| Don’t interrupt host | TTS cooldowns + behavior engines | Not reachable |
| Natural TTS emotion | voice + emotion engines | Not reachable on TikTok path |
| Avatar reaction | `useAvatarReactions` / lip sync | Not reachable |

SYLORA already has first-party AI chat + voice contracts that can power co-host **after** a real event source exists.

---

## What remains to do

1. Owner starts a real TikTok LIVE on the target account (or provides another live `@username`).
2. Provide `TIKTOOL_API_KEY` **or** confirm Eulerstream/`SIGN_API_KEY` path still works in 2026.
3. Re-run `./scripts/probe-tiktok-legacy.sh <username>` until connect + ≥1 real `chat`/`gift` event succeeds.
4. Legal/product gate: official TikTok LIVE partnership **or** explicit owner acceptance that unofficial ingest stays outside SYLORA production adapters.
5. Only then: implement `TikTokLiveAdapter` (separate package), map events → `LiveEventHub`, port co-host priority/TTS/barge-in rules, attach avatar/TTS providers, capture real video/screenshots.

---

## Commands for the owner machine

```bash
# 1) Be LIVE on TikTok first
# 2) Optional provider key
export TIKTOOL_API_KEY=tk_...
export LIVE_PROVIDER=tiktools   # or euler

# 3) Probe without simulator
./scripts/probe-tiktok-legacy.sh YOUR_TIKTOK_USERNAME

# Expected READY signal: CONNECTED + at least one real chat/gift event in the log
# If you only see simulator / demo mode — that is NOT proof
```

---

## Artifact index

| File | Meaning |
|---|---|
| `scripts/probe-tiktok-legacy.sh` | Reproducible real probe (no demo) |
| `/opt/cursor/artifacts/tiktok-audit/PROBE_SUMMARY.txt` | Short failure summary |
| `/opt/cursor/artifacts/tiktok-audit/00-tiktok-probe-failed.png` | Visual evidence of failed connect |
| `/opt/cursor/artifacts/tiktok-audit/*.log` | Raw connector / im-fetch / diag logs |
