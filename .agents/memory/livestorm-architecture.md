---
name: LiveStorm AI Architecture
description: Stack, event pipeline, AI Co-Host design, adapter pattern, and key caveats
---

# Stack
- Frontend: React + Vite at `/` (artifact: livestorm-ai)
- API server: Express + esbuild bundle — **build && start, NOT tsx watch** — restart required for every code change
- DB: PostgreSQL via Drizzle ORM (lib/db); migrate with `pnpm --filter @workspace/db push`
- Auth: Clerk (cookie-based frontend; JWT bearer for OBS overlays)
- Realtime: Socket.io at path `/api/socket.io`; room: `session:${sessionId}`

# Build pattern (critical)
API server: `esbuild build.mjs` → `dist/index.mjs` → `node --enable-source-maps dist/index.mjs`
Any backend code change requires workflow restart. Frontend uses Vite HMR (instant).

# Socket Events
`live:event` · `ai:announcement` · `moderation:flagged` · `automation:fired` · `session:ended`
All emitted to room `session:${sessionId}`. OBS overlays join via `obs:subscribe`.

# AI Co-Host Pipeline (socketServer.ts → processAiAnnouncements)
1. gift → emitAiGiftAnnouncement() if announceGifts && coins >= threshold
2. follow → generateCommentReply("just followed!") if announceLevelUp → emits ai:announcement
3. comment:
   a. moderateComment() if moderationEnabled → moderation:flagged + DB insert
   b. generateCommentReply() if autoReplyEnabled && !flagged && spam cooldown passed
   c. Spam map key: `${sessionId}:${viewerName}` → lastReplyMs; cleaned every 5 min

**Why:** AI failures must never crash the event pipeline — every AI call is inside try/catch.

# Anti-Spam
- Module-level Map<`${sessionId}:${viewer}`, ms>
- cooldownMs = spamProtectionEnabled ? max(5, cooldownSeconds)*1000 : 0
- Manual replies (POST /ai/reply-to-comment) bypass spam map entirely
- Cleanup: setInterval every 5 min removes entries older than 10 min

# Language Support
replyLanguage: "auto"|"en"|"uk"|"pl"|"ru" stored in DB.
"auto" = OpenAI detects viewer language from comment text and replies in same language.

# Voice / TTS Design
- voiceEnabled (bool) + voiceName (string) persisted in DB
- ttsMode ("off"|"browser"|"openai") is LOCAL state — session-scoped, not persisted as enum
- Frontend loads config → inits ttsMode from voiceEnabled → syncs to useLiveSession refs
- useLiveSession ttsModeRef/ttsVoiceRef are refs (no re-render), read on each ai:announcement
- openai TTS: POST /api/ai/voice → audio/mpeg → Blob URL → Audio().play()

# TikTok Adapter Pattern
tiktokConnector.ts: dynamic import("tiktok-live-connector"), silently falls back to simulator.
Connector unavailable in Replit (es5-ext 403 pnpm). Always uses simulator in this env.
In production: install package → startLiveConnector() maps gift/chat/like/follow/share/roomUser.
TikTok has no "subscription" event in the unofficial connector.

# Key DB Tables (ai schema)
aiPersonaConfigsTable columns: personaName, tone, announceGifts, announceGiftThreshold,
announceLevelUp, announceBossKill, moderationEnabled, autoReplyEnabled, replyLanguage,
spamProtectionEnabled, spamCooldownSeconds, voiceEnabled, voiceName

# Known Gaps
- GET /api/sessions/active does NOT return mode (live/demo) — only POST /api/sessions/start does
- No "subscription" event type — TikTok unofficial API doesn't expose it
- announceLevelUp boolean is reused to control follow announcements (naming mismatch)
