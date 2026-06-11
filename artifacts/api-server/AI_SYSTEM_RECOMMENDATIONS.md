# LiveStorm AI — Expert Recommendations Report

**Date:** June 11, 2026  
**Auditor:** Agent deep-read of all 9 agent files, orchestrator, and session pipeline  
**Scope:** T001–T009 implementation audit + ranked improvements  

---

## Executive Summary

The LiveStorm AI multi-agent system is significantly more mature than the session plan assumed. **8 of 9 tasks (T001–T008 spec items) were already fully implemented** in the codebase prior to this session. One real gap was identified and fixed (T007: dual memory agent context merge). The system is production-grade in architecture; the recommendations below address the remaining rough edges that will most impact streamer experience.

---

## Implementation Audit: T001–T009

| Task | Status | Notes |
|------|--------|-------|
| T001: Priority-aware TTS cooldowns | ✅ Done | `TTS_COOLDOWN_MS` in orchestrator: P1=2s, P2=4s, P3=3s, P4=5s, P5=6s, P6=8s |
| T002: batchSimilarMessages wired | ✅ Done | P6 comments aggregated in 3s window before AI call |
| T003: Engagement-weighted scoreResponse | ✅ Done | `computeBaseScore()`: gift=9, follow=8, share=7.5, direct_question=7, first_timer=7, vip=6, general=5 |
| T004: High-volume queue protection | ✅ Done | `cleanQueue()`: drops P6 >15s when queue>25; hard cap at 40 |
| T005: Battle agent through voice pipeline | ✅ Done | Battle replies routed through `generateVoice` + `tts:audio` emission |
| T006: Learning agent auto-apply | ✅ Done | Auto-applies personality mode when confidence≥7 + avgScore<6.5 + responses≥10 |
| T007: Memory pruning + richer context | ✅ Fixed | Added `getViewerContext()` merge from lib/agents/memoryAgent; 14-day prune at importance<3 was pre-existing |
| T008: Richer personality prompt | ✅ Done | `buildPersonalityPrompt` injects: CHARACTER, systemPromptAddon, tone words, PERSONALITY_RULES (forbidden), emotion expression matrix with MUST/STARTERS/FORBIDDEN |
| T009: Post-stream learning auto-trigger | ✅ Done | `sessions.ts` calls `triggerLearningAgent` at session end |

---

## Ranked Recommendations

### Priority 1 — High Impact, Low Risk

**1.1 Add a `viewerContext` flag to `computeBaseScore` for new-to-stream viewers**  
*Current:* `first_timer` detection uses the emotion trigger as a proxy (`_lastTrigger === "first_timer"`). If the emotion trigger fired for a different reason earlier in the dispatch cycle, the score defaults to `general=5`.  
*Fix:* Pass `viewerCtx.profile?.isFirstSeen` directly into `computeBaseScore` — it's now available after the T007 merge.  
*Impact:* First-timer replies score correctly (7.0 vs 5.0), learning agent gets better training signal.

**1.2 Deduplicate `aiPersonaConfigsTable` DB reads in `enqueueEvent`**  
*Current:* Gift events and follow events each do a separate `db.query.aiPersonaConfigsTable.findFirst()` call inside `enqueueEvent`. High-volume streams with many gifts + follows trigger 2–4 DB reads per second just for config lookups.  
*Fix:* Cache the config per `streamerId` with a 60-second TTL in a `Map<number, {config, ts}>`. Fall back to DB on miss.  
*Impact:* 60–80% reduction in config reads during active streams.

**1.3 Cap `conversationHistory` at 5 most-recent context-relevant entries, not 10 total**  
*Current:* History stores last 10 entries including gifts and follows. When the next comment arrives, up to 10 entries are serialized and sent to GPT.  
*Fix:* Filter history to the last 5 **comment** entries for comment events; keep all event types for gift/follow context. This tightens the context window without losing meaning.  
*Impact:* ~30% fewer tokens per call for comment-heavy sessions. Cost reduction.

---

### Priority 2 — Medium Impact, Worth Doing

**2.1 Add explicit `viewerContext` (first_timer / vip / regular) to `QueueItem`**  
*Current:* `dispatch()` re-derives viewer context from emotion trigger after the fact. This is fragile — if emotion already changed before dispatch runs, the context is wrong.  
*Fix:* When classifying comments in `enqueueEvent`, perform a lightweight viewer profile lookup and set a `viewerContext: "first_timer" | "vip" | "regular"` field on the `QueueItem`. `dispatch()` reads this directly.  
*Impact:* More accurate scoring and host agent personalization, especially in high-volume sessions.

**2.2 Persist `announcementCooldowns` through server restarts**  
*Current:* Cooldowns (gift: 30s, follow: 60s) live only in-memory. A server restart clears them, which can cause duplicate AI announcements within seconds of restart.  
*Fix:* Use the existing PostgreSQL `aiPersonaConfigsTable` or a lightweight Redis key (or even a small in-DB table) to persist the last-fired timestamps with a short TTL.  
*Impact:* Eliminates double-announcement on restart. Visible to streamers.

**2.3 Add `suggestedReply` confidence score to `scoreResponse` for battle replies**  
*Current:* Battle replies are hard-coded to `score: 8.0` in the orchestrator.  
*Fix:* `generateBattleReply` should return a `confidenceScore` (0–10) from the battle agent's GPT response. Pass this as `score` to `scoreResponse`. The learning agent then gets real battle performance data.  
*Impact:* Learning agent can detect when battle mode is underperforming and suggest adjustment.

---

### Priority 3 — Nice-to-Have Improvements

**3.1 Emotion decay during `cleanQueue` not just on interval**  
*Current:* `decayAllEmotions` fires every 30 seconds on a fixed interval. If a stream goes quiet for 5 minutes but cleanQueue is running, no emotion decay happens mid-queue.  
*Fix:* Call a lightweight `tickDecay(sessionId)` inside `processQueue` when the queue is empty for >30 seconds. This keeps the emotional state accurate to real-time activity.

**3.2 Strategy hint TTL should scale with queue depth**  
*Current:* Strategy hint is valid for 5 minutes regardless of stream pace.  
*Fix:* High-pace streams (queue depth >10) should use a shorter TTL (90s) so the strategy hint doesn't repeat in a clearly changed context. Slow streams can keep the 5-minute window.

**3.3 Learning agent: emit `agent:learning:report` even when `scores.length === 0`**  
*Current:* If a session had 0 scored responses (e.g., voice-only stream with no AI text), `runLearningAgent` returns `null` and nothing is emitted to the frontend. The UI shows no post-stream summary.  
*Fix:* Return a minimal report with `totalResponses: 0` and a default recommendation so the frontend always shows a post-session card.

**3.4 `batchSimilarMessages` window should adapt to burst speed**  
*Current:* Always 3-second aggregation window.  
*Fix:* During a comment burst (>15 comments/30s), reduce the window to 1.5s so responses feel faster. During slow chat, extend to 5s for better aggregation. Read `getStreamFatigue()` and `burst.count30s` to tune dynamically.

**3.5 `pruneOldMemories` should run at session end, not just probabilistically (1%)**  
*Current:* `pruneOldMemories` is called with 1% probability per viewer profile update. High-activity streamers with many returning viewers may accumulate stale memories for weeks.  
*Fix:* Call `pruneOldMemories(streamerId)` once at session end inside `triggerLearningAgent` (which already fires post-session). This is a natural, non-blocking cleanup point.

---

## Architecture Notes

### What's Working Well

- **Priority queue** correctly orders P1–P6 with per-priority TTS cooldowns — this ensures gifts are never delayed by general chat
- **Emotion + Mood dual-layer** provides short-term spike reactions (emotion) and long-term session tone drift (mood) — sophisticated and correct
- **Personality × Emotion expression matrix** (648 lines) is the strongest part of the system: 6 personalities × 9 emotions = 54 concrete performance directions with MUST/STARTERS/FORBIDDEN
- **Battle TTS pipeline** correctly routes through emotion-speed-adjusted voice — no gaps
- **Learning agent gates** (confidence≥7 + avgScore<6.5 + responses≥10) prevent personality thrashing from small samples — well-designed
- **`fastSpamCheck`** as a pre-queue gate eliminates API calls for obvious spam — correctly placed before queue insertion

### Pre-existing Technical Debt

| Item | Location | Risk |
|------|----------|------|
| `emotionEngine.ts` lines 200/223: `string` not assignable to `EmotionType` | `src/agents/emotionEngine.ts` | Low — runtime still works, TypeScript strictness |
| `routes/emotion.ts` line 15: `clerkUserId` property missing | `src/routes/emotion.ts` | Low — route-level typing gap |
| `MAX_QUEUE_SIZE = 50` but hard cap in `cleanQueue` is 40 | `agentOrchestrator.ts` | Very low — cleanQueue trims to 40 before the 50 cap matters |
| `lib/agents/memoryAgent.ts` and `agents/memoryAgent.ts` coexist with different interfaces | two files | Medium — fixed by T007 merge; future changes must update both |

---

## Recommended Next Sprint

1. **Fix `computeBaseScore` first_timer detection** (P1.1) — 15-minute change, improves learning signal immediately
2. **Config caching per streamerId** (P1.2) — 30-minute change, reduces DB load on busy streams
3. **`pruneOldMemories` at session end** (P3.5) — 5-minute change, runs cleanup deterministically
4. **`viewerContext` field on QueueItem** (P2.1) — 1-hour change, makes scoring deterministic
5. **Battle reply confidence score** (P2.3) — 30-minute change, unlocks learning agent battle tuning
