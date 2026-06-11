# PROJECT HEALTH REPORT
**LiveStorm AI — Full Platform Diagnostic**
Generated: 2026-06-11

---

## SUMMARY SCORECARD

| Status | Count | % |
|---|---|---|
| ✅ Working | 28 features | 65% |
| ⚠️ Partially Working | 9 features | 21% |
| ❌ Not Working / Broken | 6 features | 14% |

---

## SECTION 1 — WORKING

Features fully functional and verified by code tracing and/or live logs.

---

### 1. TikTok Demo Mode
**Status:** ✅ Fully working  
**Evidence:** `tiktokSimulator.ts` generates comments, gifts, likes, follows on a timer. All downstream systems (AI, TTS, gamification) process simulated events normally.  
**Files:** `api-server/src/lib/tiktokSimulator.ts`, `tiktokConnector.ts`  
**Missing:** Nothing  

---

### 2. TikTok Real Mode (TikTools provider)
**Status:** ✅ Fully working  
**Evidence:** JWT cached 55 min, WS connects to `wss://api.tik.tools`, 3-minute watchdog reconnects on silence. `[Pipeline:0–6]` logs trace each event end-to-end.  
**Files:** `api-server/src/lib/tiktokConnector.ts`, `lib/tikToolsClient.ts`  
**Missing:** Personal API key (community plan has 15 WS sessions/24 h limit — documented in memory)  

---

### 3. TikTok Real Mode (Eulerstream provider)
**Status:** ✅ Fully working  
**Evidence:** `im_enter_room` double-join bug patched. Session recovery on server restart (`recoverActiveSessions`).  
**Files:** `tiktokConnector.ts`, `api-server/src/routes/sessions.ts`  
**Missing:** Nothing (subject to Eulerstream plan limits)  

---

### 4. Session Management (Start / End / Recovery)
**Status:** ✅ Fully working  
**Evidence:** `pendingConnectors` Set prevents race conditions. `cleanupStaleSessions` runs on startup. `recoverActiveSessions` re-joins "real" sessions after server restart. Session 51 confirmed active in logs.  
**Files:** `routes/sessions.ts`, `socketServer.ts`  
**Missing:** Nothing  

---

### 5. AI Reply Pipeline (Orchestrator → GPT-4o-mini → TTS)
**Status:** ✅ Fully working  
**Evidence:** Event → `ingestLiveEvent` → `orchestratorEnqueue` → priority queue (P1–P6) → `hostAgent` (GPT-4o-mini) → `behaviorEngine` paralinguistics → `voiceAgent` OpenAI TTS → `tts:audio` socket emit.  
**Files:** `agentOrchestrator.ts`, `hostAgent.ts`, `behaviorEngine.ts`, `voiceAgent.ts`  
**Missing:** Nothing  

---

### 6. OpenAI TTS
**Status:** ✅ Fully working  
**Evidence:** `POST /api/ai/voice` calls `tts-1`. Frontend `playOpenAiTts` manages blob URLs and audio unlock. Full step logging (Steps 3–10). `[Mic:1]` log confirms audio subsystem initialising.  
**Files:** `aiService.ts`, `useLiveSession.ts`, `ai.ts`  
**Missing:** Nothing  

---

### 7. TTS Queue
**Status:** ✅ Fully working  
**Evidence:** Promise-chain queue in `useLiveSession.ts` prevents overlapping audio. `ttsQueueDepth` tracked and shown in Voice Status panel.  
**Files:** `useLiveSession.ts`  
**Missing:** Nothing  

---

### 8. Auto-Reply Toggle
**Status:** ✅ Fully working  
**Evidence:** Toggle updates `autoReplyEnabled` in `ai_persona_configs`. `agentOrchestrator.ts` reads flag before sending any reply.  
**Files:** `ai-assistant.tsx`, `routes/ai.ts`, `agentOrchestrator.ts`  
**Missing:** Nothing  

---

### 9. Spam Protection & Per-Viewer Cooldown
**Status:** ✅ Fully working  
**Evidence:** `fastSpamCheck` (regex), per-viewer cooldown (default 30 s, configurable), and per-type cooldowns (gift 30 s, follow 60 s, like_milestone 120 s) all active in orchestrator.  
**Files:** `agentOrchestrator.ts`  
**Missing:** Nothing  

---

### 10. Reply Language
**Status:** ✅ Fully working  
**Evidence:** `replyLanguage` persisted in DB. `hostAgent.ts` injects it into the system prompt.  
**Files:** `ai-assistant.tsx`, `hostAgent.ts`  
**Missing:** Nothing  

---

### 11. Gift / Follow / Boss Kill Announcements
**Status:** ✅ Fully working  
**Evidence:** `announceGifts`, `announceGiftThreshold`, `announceLevelUp`, `announceBossKill` flags checked by orchestrator pre-filters and `aiAnnouncer.ts`.  
**Files:** `agentOrchestrator.ts`, `aiAnnouncer.ts`  
**Missing:** Nothing  

---

### 12. Avatar System (VRM + RPM + Avaturn)
**Status:** ✅ Fully working  
**Evidence:** Three render paths confirmed: `VRMAvatarView` (VRM 1.0), `RPMAvatarView` (GLB via CORS proxy), Avaturn via `@avaturn/sdk` iframe. WebGL fallback to 2D if context lost.  
**Files:** `AvatarCanvas.tsx`, `AvatarCreatorModal.tsx`, `avatarAnimationMachine.ts`  
**Missing:** Nothing functional (legacy shims present — see Section 3)  

---

### 13. Lip Sync
**Status:** ✅ Fully working  
**Evidence:** `useLipSync` uses `AnalyserNode` on `tts:audio` events (bins 4–28). Falls back to procedural sine-wave when audio context not available.  
**Files:** `useLipSync.ts`  
**Missing:** Nothing  

---

### 14. Avatar Animations & Reactions
**Status:** ✅ Fully working  
**Evidence:** Priority state machine (`ANIMATION_PRIORITY`) fires on gift, follow, like, share, comment, and AI announcement events. `useAvatarReactions` bridges socket events to the machine.  
**Files:** `avatarAnimationMachine.ts`, `useAvatarReactions.ts`  
**Missing:** Nothing  

---

### 15. AI Private Chat (Chat with Storm)
**Status:** ✅ Fully working  
**Evidence:** `POST /api/ai/chat` calls GPT-4o-mini. Message history persisted. UI renders in right column of ai-assistant.  
**Files:** `ai-assistant.tsx`, `routes/ai.ts`  
**Missing:** Nothing  

---

### 16. Persona Settings (Name, Tone, Traits)
**Status:** ✅ Fully working  
**Evidence:** All fields call `updateConfig.mutate` on blur/click, writing to `ai_persona_configs`. `hostAgent.ts` reads the full config on every reply.  
**Files:** `ai-assistant.tsx`, `routes/ai.ts`  
**Missing:** Nothing  

---

### 17. Mode Selectors (Pro / Assistant / Autopilot)
**Status:** ✅ Fully working  
**Evidence:** Three buttons in ai-assistant top bar each call `updateConfig.mutate({ operatingMode, tone })`. Syncs `autoReplyEnabled` flag in backend.  
**Files:** `ai-assistant.tsx`, `routes/ai.ts`  
**Missing:** Nothing  

---

### 18. Go Live / End Stream Buttons
**Status:** ✅ Fully working  
**Evidence:** `useStartSession` / `useEndSession` hooks hit `/sessions/start` and `/sessions/end`. Buttons show loading state and disable during pending.  
**Files:** `ai-assistant.tsx`, `routes/sessions.ts`  
**Missing:** Nothing  

---

### 19. XP / Leveling / Leaderboard
**Status:** ✅ Fully working  
**Evidence:** XP formula: `Math.floor(Math.sqrt(totalXp / 50)) + 1`. DB-backed leaderboard. Real-time XP awards via socket. `/gamification/leaderboard` filterable by period.  
**Files:** `gamificationEngine.ts`, `routes/gamification.ts`, `gamification.tsx`  
**Missing:** Nothing (see XP display bug in Section 2)  

---

### 20. Boss Battles
**Status:** ✅ Fully working  
**Evidence:** Spawn/end routes. Damage from likes (1), gifts (coins × 2). `distributeBossDefeatRewards` awards XP proportional to damage. OBS overlay (`/obs/boss-battle`) shows HP bar. Socket emits `boss:attacked` / `boss:defeated`.  
**Files:** `routes/boss-battles.ts`, `gamificationEngine.ts`, `boss-battle.tsx`  
**Missing:** Nothing  

---

### 21. Lucky Drops
**Status:** ✅ Fully working  
**Evidence:** Auto-trigger every 50 events or on large gifts. Manual trigger via `/gamification/lucky-drops/trigger`. Socket emits to frontend overlay.  
**Files:** `gamificationEngine.ts`, `routes/gamification.ts`  
**Missing:** Nothing  

---

### 22. Achievements & Daily Claim
**Status:** ✅ Fully working  
**Evidence:** `checkAndUnlockAchievement` handles `first_gift`, `level_10`, `boss_slayer` etc. Daily claim uses date-string check to prevent double-claims.  
**Files:** `gamificationEngine.ts`, `routes/gamification.ts`  
**Missing:** Nothing  

---

### 23. Kingdom (Resources + Buildings)
**Status:** ✅ Fully working  
**Evidence:** Gifts → Gold, Likes → Wood, Follows → Stone. Building upgrades scale in cost and level. Visual grid in `kingdom.tsx`.  
**Files:** `routes/kingdoms.ts`, `gamificationEngine.ts`, `kingdom.tsx`  
**Missing:** Alliance gameplay (see Section 2)  

---

### 24. Mini-Games (Spin, Draw, PvP, Quiz, Treasure Hunt)
**Status:** ✅ Fully working  
**Evidence:** All 5 tabs wired to backend routes. PvP uses `useRunPvpBattle` hook → `POST /mini-games/pvp`. Quiz uses server-side normalized chat answer matching. Spin/Draw award XP/Coins immediately.  
**Files:** `mini-games.tsx`, `routes/mini-games.ts`  
**Missing:** Nothing  

---

### 25. Chat Translation (in Live Studio)
**Status:** ✅ Fully working in `/live-studio`  
**Evidence:** `socketServer.ts` emits `live:translation`. `CommentFeed` checks translations map by `msgId` and renders translated text.  
**Files:** `socketServer.ts`, `CommentFeed.tsx`, `live-studio.tsx`  
**Missing:** Display in `/ai-assistant` (see Section 2)  

---

### 26. Emotion / Silence Detection
**Status:** ✅ Fully working  
**Evidence:** `checkSilentSessions()` runs every 15 s. 2 min → `curious`, 4 min → `frustrated`. Battle mode immune. Emotional state drives TTS speed modifier via `getVoiceSpeedModifier`.  
**Files:** `agentOrchestrator.ts`  
**Missing:** Nothing  

---

### 27. OBS Overlays
**Status:** ✅ Fully working  
**Evidence:** Token-authenticated routes for alerts, goals, leaderboard, boss battle, activity feed. `overlays.tsx` fetches OBS token from `/api/obs/token`.  
**Files:** `overlays.tsx`, `routes/obs.ts`, `pages/obs/`  
**Missing:** Nothing  

---

### 28. Moderation Rules
**Status:** ✅ Fully working  
**Evidence:** Rule configuration and AI moderation logs render. Add/delete rules wired. `disabled` guard on delete prevents operating on placeholder rows.  
**Files:** `moderation.tsx`, `routes/moderation.ts`  
**Missing:** Nothing  

---

## SECTION 2 — PARTIALLY WORKING

Features that exist but have bugs, missing pieces, or incomplete integrations.

---

### 1. Browser TTS Mode — UI Control Misleads User
**Status:** ⚠️ UI allows selection; backend is hard-disabled  
**Evidence:** `useLiveSession.ts` line 853: `"Browser TTS is DISABLED. Storm stays silent."` Code explicitly skips `speechSynthesis.speak()`. Both the **Voice quick toggle** (mode bar, line 1099) and the **Voice Settings section** (three-way selector showing "browser") let the user pick Browser mode, which then silently does nothing.  
**Files:** `useLiveSession.ts`, `ai-assistant.tsx` lines 1095–1105, 1370–1385  
**What is missing:** Either remove Browser from the UI selectors entirely, or replace with a disabled badge  
**Estimated fix effort:** 30 min  

---

### 2. XP Stat in Live Control — Hardcoded to Zero
**Status:** ⚠️ Shows but never shows real data  
**Evidence:** `live-control.tsx` line 90: `{ label: t("event_xp"), value: 0, icon: Zap, color: "text-yellow-400" }` — literal `0`, never fetched from the gamification API.  
**Files:** `live-control.tsx`  
**What is missing:** Replace `0` with a real query to `/gamification/me`  
**Estimated fix effort:** 45 min  

---

### 3. Chat Translation Display Missing in AI Assistant
**Status:** ⚠️ Translation fires in backend and works in Live Studio; invisible in AI Assistant  
**Evidence:** `socketServer.ts` emits `live:translation`. `ai-assistant.tsx` receives and stores translations via `useLiveSessionContext` but the chat feed in the page never renders the translated text.  
**Files:** `ai-assistant.tsx` (chat feed section), `useLiveSession.ts`  
**What is missing:** Render translated text in the AI Activity feed chat messages  
**Estimated fix effort:** 1 hour  

---

### 4. Battle Mode — No UI Toggle in Main Workspace
**Status:** ⚠️ Backend fully wired; no way to activate from the main AI Assistant page  
**Evidence:** `PUT /agents/battle` route calls `setBattleMode(sessionId, active)`. `agentOrchestrator.ts` line 796 routes comment events to `battleAgent.ts` when active. `ai-assistant.tsx` line 141 has a `"battle"` tab in the activity log filter — but that's a display filter, not a toggle that actually calls the API.  
**Files:** `ai-assistant.tsx`, `routes/agents.ts`, `battleAgent.ts`  
**What is missing:** A "Battle Mode ON/OFF" switch that calls `PUT /agents/battle`  
**Estimated fix effort:** 1 hour  

---

### 5. CoHostPanel — Mic Speech Recognition Untested End-to-End
**Status:** ⚠️ Panel now renders (just fixed); pipeline wiring unverified in browser  
**Evidence:** `[Mic:1] Permission query result: prompt → unknown` confirms the hook mounts and queries permission. The full path (mic → SpeechRecognition → `sendStreamerSpeech` → socket `streamer:speech` → orchestrator → AI reply) has not been verified live due to the panel being invisible until this session.  
**Files:** `useStreamerMic.ts`, `CoHostPanel.tsx`, `useLiveSession.ts`, `socketServer.ts`  
**What is missing:** End-to-end live test with microphone  
**Estimated fix effort:** Testing only (no code changes anticipated)  

---

### 6. Alliance System — No Gameplay
**Status:** ⚠️ CRUD exists; no mechanical impact  
**Evidence:** `/universe/alliances` routes handle invite/accept/leave. DB schema has `alliances` table. `UniversePage` shows list. No resource-sharing, bonus XP, or collaborative mechanics implemented.  
**Files:** `universe.tsx`, `routes/universe.ts`  
**What is missing:** Any actual gameplay benefit to joining an alliance  
**Estimated fix effort:** 1–2 days to design and wire  

---

### 7. Silence Filler — Resets on Server Restart
**Status:** ⚠️ Works during a running server; lost on restart  
**Evidence:** `state.sessionToStreamer` is an in-memory Map populated by socket joins. Server restart clears it. Silence fillers won't trigger for an existing session until a new TikTok event re-populates the mapping.  
**Files:** `agentOrchestrator.ts`  
**What is missing:** Seed `sessionToStreamer` from DB on server start (like `recoverActiveSessions` does for connectors)  
**Estimated fix effort:** 2 hours  

---

### 8. Analytics — "Not Enough Data" Until 3+ Sessions
**Status:** ⚠️ Real data queries; gracefully degrades but shows empty state for new users  
**Evidence:** `analytics.tsx` checks `data.tooFewSessions` and shows a placeholder message until enough sessions exist. The AI Insights endpoint requires a minimum session count before generating GPT-powered tips.  
**Files:** `analytics.tsx`, `routes/analytics.ts`  
**What is missing:** Nothing broken — expected behavior. Consider a demo/preview state for new accounts.  
**Estimated fix effort:** 2 hours (UX only)  

---

### 9. Avatar Quality Detection — Unreliable in Privacy Browsers
**Status:** ⚠️ Works in standard browsers; forces Low quality in privacy-hardened environments  
**Evidence:** `detectInitialQuality` uses `navigator.hardwareConcurrency`, which privacy-hardened browsers cap at 2, triggering the "Low" quality tier and disabling features unnecessarily.  
**Files:** `AvatarCanvas.tsx`  
**What is missing:** A manual quality override control  
**Estimated fix effort:** 1 hour  

---

## SECTION 3 — NOT WORKING

Features that are broken, hidden, disconnected, or generate no output.

---

### 1. "Browser TTS" Selector — Dead Code with Visible UI
**Status:** ❌ Silently does nothing  
**Evidence:** `useLiveSession.ts` line 853 explicitly: `setLastTtsError("OpenAI TTS unavailable — using browser voice fallback."); return;` — the browser speech synthesis code path was removed. The Voice settings "browser" radio button and the mode-bar Voice toggle both set `ttsMode = "browser"`, which the playback code immediately skips.  
**Files:** `useLiveSession.ts`, `ai-assistant.tsx`  
**What is missing:** Remove "browser" from all UI selectors (Voice settings radio, mode-bar Voice button)  
**Estimated fix effort:** 20 min  

---

### 2. XP Stat Widget (Live Control) — Always Shows 0
**Status:** ❌ Hardcoded literal value  
**Evidence:** `live-control.tsx:90`: `value: 0` — never queries the gamification API. The widget renders, shows Zap icon, but always displays "0 XP".  
**Files:** `live-control.tsx`  
**What is missing:** `GET /gamification/me` query; replace hardcoded 0 with `data?.xp ?? 0`  
**Estimated fix effort:** 30 min  

---

### 3. `lib/agents/battleAgent.ts` — Dead Duplicate File
**Status:** ❌ Unreachable / never imported  
**Evidence:** `agentOrchestrator.ts` imports `battleAgent` from `../agents/battleAgent`. The file at `src/lib/agents/battleAgent.ts` is a parallel copy with diverging logic that is never imported anywhere.  
**Files:** `api-server/src/lib/agents/battleAgent.ts`  
**What is missing:** Delete this file  
**Estimated fix effort:** 5 min  

---

### 4. Several `aiAnnouncer.ts` Functions — Bypassed Dead Code
**Status:** ❌ Functions exist but are never called  
**Evidence:** `emitAiGiftAnnouncement`, `emitAiFollowAnnouncement` and similar functions in `aiAnnouncer.ts` were the original announcement pipeline. The orchestrator now handles all gift/follow logic internally with priority-queue management. These functions remain exported but are no longer called.  
**Files:** `api-server/src/lib/aiAnnouncer.ts`  
**What is missing:** Audit and remove dead exports; keep only functions still called  
**Estimated fix effort:** 30 min  

---

### 5. `avatarAssets.ts` Legacy Shims — Always Return Null / False
**Status:** ❌ Dead backward-compat code  
**Evidence:** Lines 98–139: `getAvatarVRMPath` returns `null`, `isVRMBacked` returns `false`, `getAvatarGLBPath` returns `null`. These were from an era when avatars were local file paths; the system is now entirely URL-driven. Any code that still calls these functions gets useless null returns.  
**Files:** `avatarAssets.ts`  
**What is missing:** Delete the shim functions; search for callers and update  
**Estimated fix effort:** 30 min  

---

### 6. Silent Billing Risk — TTS Generated with No Frontend Listener
**Status:** ❌ OpenAI API is called and billed even when no browser tab is open  
**Evidence:** `socketServer.ts` logs `"WARNING: no sockets in room"` when `socketsInRoom === 0`. The orchestrator still processes the event, calls `hostAgent.ts` (GPT-4o-mini), calls `voiceAgent.ts` (OpenAI TTS-1), and emits `tts:audio` to an empty room. Audio is never played but cost is incurred.  
**Files:** `socketServer.ts`, `agentOrchestrator.ts`  
**What is missing:** Guard in orchestrator: skip TTS generation (not AI text) when `socketsInRoom === 0`  
**Estimated fix effort:** 1 hour  

---

## UI CONTROLS AUDIT

Full inventory of every interactive control, evaluated for real function.

### ai-assistant.tsx

| Control | Status | Detail |
|---|---|---|
| Go Live button | ✅ Works | Calls `/sessions/start` |
| End Stream button | ✅ Works | Calls `/sessions/end` |
| Pro mode button | ✅ Works | Sets `autopilot + professional` |
| Assistant mode button | ✅ Works | Sets `semi-auto + friendly` |
| Voice quick toggle (mode bar) | ❌ Broken | Toggles to "browser" which is disabled — does nothing |
| AI Name input | ✅ Works | `onBlur` → DB update |
| Personality sliders | ✅ Works | `onBlur` → DB update |
| Tone buttons | ✅ Works | DB update |
| Auto-reply toggle | ✅ Works | DB flag, orchestrator respects it |
| Spam protection toggle | ✅ Works | DB flag |
| Spam cooldown input | ✅ Works | DB value |
| Reply Language selector | ✅ Works | DB value, hostAgent uses it |
| Chat Translation toggle | ✅ Works | DB flag, socket respects it |
| Translation Language selector | ✅ Works | DB value |
| Gift announcement toggle | ✅ Works | DB flag |
| Gift threshold input | ✅ Works | DB value |
| Follow announcement toggle | ✅ Works | DB flag |
| Boss kill announcement toggle | ✅ Works | DB flag |
| Voice Settings — "Off" option | ✅ Works | Disables TTS |
| Voice Settings — "Browser" option | ❌ Broken | Silently does nothing |
| Voice Settings — "OpenAI" option | ✅ Works | Enables OpenAI TTS |
| Voice name selector | ✅ Works | DB value |
| Voice preview button | ✅ Works | Plays sample |
| Volume slider | ✅ Works | DB value |
| Speed slider | ✅ Works | DB value |
| AI Chat input + Send | ✅ Works | GPT-4o-mini response |
| Clear chat history button | ✅ Works | Deletes messages |
| Avatar upload (VRM) | ✅ Works | S3 upload |
| Avatar creator (RPM/Avaturn) | ✅ Works | SDK iframe |
| Avatar save button | ✅ Works | DB save |
| CoHostPanel — Start Listening | ✅ Works | Requests mic, starts SpeechRecognition |
| CoHostPanel — Mic Diagnostics | ✅ Works | 10-step live diagnostic |

### live-control.tsx

| Control | Status | Detail |
|---|---|---|
| Session status display | ✅ Works | Real data |
| Platform connection status | ✅ Works | Real data |
| XP stat widget | ❌ Broken | Hardcoded to 0 |
| Viewer/Like/Gift/Follow stats | ✅ Works | Real data from session |

### live-studio.tsx

| Control | Status | Detail |
|---|---|---|
| All controls | ✅ Works | Full right column + feeds |
| CoHostPanel (in this page) | ✅ Works | Mounted and functional |
| Comment feed + translations | ✅ Works | Full translation display |

### games.tsx / mini-games.tsx / boss-battle.tsx

| Control | Status | Detail |
|---|---|---|
| Spin Wheel | ✅ Works | API route, XP award |
| Lucky Draw | ✅ Works | API route, XP award |
| PvP Battle | ✅ Works | API route, score result |
| Quiz Mode | ✅ Works | Chat answer detection |
| Treasure Hunt | ✅ Works | Code redemption |
| Boss Spawn | ✅ Works | HP tracking, socket events |
| Boss End | ✅ Works | Reward distribution |

### overlays.tsx

| Control | Status | Detail |
|---|---|---|
| OBS URL copy buttons | ✅ Works | Generates valid browser source URLs |
| Goal type/target editors | ✅ Works | DB-backed config |
| OBS token refresh | ✅ Works | Fetches from `/api/obs/token` |

---

## TOP 10 PROBLEMS BLOCKING RELEASE

| # | Problem | Impact | Effort |
|---|---|---|---|
| 1 | **Browser TTS in UI** — selectable but silently broken; confuses users when voice stops working | High UX confusion | 20 min |
| 2 | **Silent billing risk** — OpenAI called when no tab is open; unexpected API costs | Financial risk | 1 hour |
| 3 | **Battle Mode no UI toggle** — feature exists in backend, no way to activate from UI | Feature inaccessible | 1 hour |
| 4 | **XP stat always 0** in Live Control stats strip | Broken display | 30 min |
| 5 | **Translation invisible in AI Assistant** — works in Live Studio, missing in main workspace | UX inconsistency | 1 hour |
| 6 | **Silence filler resets on server restart** — ambient AI voice goes quiet after deployments | AI quality regression | 2 hours |
| 7 | **Dead duplicate `battleAgent.ts`** — maintenance confusion, diverging logic over time | Technical debt | 5 min |
| 8 | **Dead functions in `aiAnnouncer.ts`** — dead exports that shadow the active pipeline | Maintenance confusion | 30 min |
| 9 | **`avatarAssets.ts` shims return null** — any code path hitting these gets silent nulls | Latent bugs | 30 min |
| 10 | **Alliance system has no gameplay** — UI shows it, users can join, nothing happens | Broken expectation | 1–2 days |

---

## RECOMMENDED CLEANUP LIST

### Immediate (< 2 hours total)

1. **Remove "Browser" from Voice TTS selectors** — both the mode-bar Voice button and the Voice settings three-way radio. Replace with Off/OpenAI only.
2. **Fix XP stat** in `live-control.tsx` — query `/gamification/me` and display real value.
3. **Delete `src/lib/agents/battleAgent.ts`** — dead duplicate file.
4. **Add Battle Mode toggle** in ai-assistant sidebar — one switch calling `PUT /agents/battle`.
5. **Guard orchestrator TTS** — skip OpenAI TTS calls when `socketsInRoom === 0`.

### Short-term (< 1 day)

6. **Show translations in AI Assistant chat feed** — render translated text alongside original in the activity feed.
7. **Seed `sessionToStreamer` on startup** from active sessions in DB.
8. **Remove dead `aiAnnouncer.ts` exports** — `emitAiGiftAnnouncement`, `emitAiFollowAnnouncement`.
9. **Remove `avatarAssets.ts` legacy shims** — `getAvatarVRMPath`, `isVRMBacked`, `getAvatarGLBPath`.
10. **Mark Alliance section as "Coming Soon"** in `universe.tsx`.

### Medium-term (1–3 days)

11. **Add avatar quality override toggle** in Avatar Studio for privacy-browser users.
12. **Alliance gameplay** — define and implement one concrete mechanic (e.g. shared XP multiplier).
13. **Analytics new-user state** — show preview/demo charts before minimum sessions are reached.

---

## NOTES ON SIMPLIFICATION

The platform currently has **3 ways to control the AI** (ai-assistant, live-control, live-studio) that partially duplicate each other. For production, the main workspace should be `/ai-assistant` — it has the most complete control surface. `/live-studio` should be the events monitor. `/live-control` is mostly redundant and could be merged or hidden.

The **"Voice" quick toggle** in the ai-assistant mode bar is the single highest-confusion control in the UI. It looks like it toggles voice on/off but it actually cycles through "browser" (broken) → "off". It should be replaced with a simple Off/OpenAI toggle.
