# LiveStorm AI — Expert System Recommendations

**Generated:** June 11, 2026  
**Scope:** Post-implementation review of the AI pipeline (T001–T009) + forward-looking analysis  
**Analyst:** Architecture review of agentOrchestrator, hostAgent, personalityAgent, learningAgent, memoryAgent, strategyAgent, behaviorEngine, moodEngine, emotionEngine

---

## What Was Built (T001–T009 Status)

| Task | Description | Status |
|------|-------------|--------|
| T001 | Priority-aware TTS cooldowns (gift=2s, follow=4s, battle=3s, general=8s) | ✅ Done |
| T002 | batchSimilarMessages wired into enqueueEvent for all P6 comments | ✅ Done |
| T003 | Engagement-weighted scoreResponse (gift=9, follow=8, question=7, VIP=6, general=5) | ✅ Done |
| T004 | Queue protection: drop P6 items >15s old when queue >25; hard cap at 40 | ✅ Done |
| T005 | Battle replies through generateVoice + tts:audio emit | ✅ Done |
| T006 | Learning agent auto-applies personality mode when confidence ≥7 + avgScore <6.5 + ≥10 responses | ✅ Done |
| T007 | Memory pruning: 14-day cutoff for importance ≤2; richer context (global + stream + joke + preference + viewer) | ✅ Done |
| T008 | buildPersonalityPrompt injects full character rules: systemPromptAddon + toneGuide + RHYTHM + FORBIDDEN + FRESHNESS + emotion performance direction | ✅ Done |
| T009 | Session end auto-triggers learning agent via triggerLearningAgent() | ✅ Done |

**Bugs fixed during this review:**
- Silence filler no longer re-arms the silence detector every 15s (added `recordActivity()` after enqueue)
- Gift/follow/share replies now appended to `conversationHistory` (previously only comments were tracked)
- `sessionToStreamer` and `lastStrategySuggestion` now cleaned up in `clearSessionHistory` (memory leak)
- Strategy suggestions now cached and injected as optional prompts into the next hostAgent call

---

## Ranked Recommendations

### TIER 1 — Critical / High Impact (address immediately)

---

#### R1: TTS "still speaking" overlap
**Problem:** `state.lastTtsTime` is set when dispatch *starts* generating the reply (line 813 in dispatch). The TTS audio buffer is generated asynchronously afterward. A high-priority event arriving 2s after a gift could start TTS before the gift audio has finished playing on the client — two voices overlap.

**Fix:** Estimate playback duration from character count and emit a `tts:cooldown` event to the client. Or: add a `processingTts: boolean` flag in state, set it `true` when the voice synthesis starts and `false` in the finally block after the audio is emitted. Block `processQueue` while `processingTts = true`.

```typescript
// In dispatch(), before generateVoice:
state.processingTts = true;
// In finally after tts:audio emit:
state.processingTts = false;

// In processQueue():
if (state.processing || state.processingTts || ...) return;
```

**Impact:** Eliminates audio overlap on fast event sequences (whale gift + immediate follow). Very noticeable to the streamer.

---

#### R2: Learning agent keyAdjustments have no mechanical effect
**Problem:** The learning agent correctly identifies `keyAdjustments` (energyLevel, responseLength, humorLevel) and stores them as a "last_session_coaching" memory. But `hostAgent.ts` never reads this memory to adjust token budgets or temperature. The coaching loop exists in data but not in behavior.

**Fix:** In `dispatch()`, after loading `memoryCtx`, check for a "last_session_coaching" memory and parse it:

```typescript
// In memoryCtx, look for: "energy:higher responseLength:shorter humor:increase"
const coachingMatch = memoryCtx.match(/last_session_coaching:\s*(energy:\S+\s+responseLength:\S+\s+humor:\S+)/);
if (coachingMatch) {
  // Pass into hostAgent as an additional adjustment hint
}
```

Or better: store `keyAdjustments` in `ai_persona_configs` as JSON columns so they're directly readable without string parsing.

**Impact:** Closes the learning loop. Right now the system "learns" but never actually changes behavior between sessions.

---

#### R3: OpenAI calls have no retry / timeout
**Problem:** `hostAgent`, `strategyAgent`, `learningAgent`, and `memoryAgent` all create their own `new OpenAI()` instances with no retry logic. A transient API error silently drops the event (returns `null`). During peak traffic periods (stream goes viral), dropped events compound with queue backpressure.

**Fix:** Create a shared `aiClient.ts` with exponential backoff:
```typescript
export async function createWithRetry(params, retries = 2): Promise<...> {
  for (let i = 0; i <= retries; i++) {
    try { return await openai.chat.completions.create(params); }
    catch (err) {
      if (i === retries) throw err;
      await sleep(500 * Math.pow(2, i));
    }
  }
}
```

**Impact:** Dramatically improves reliability during API hiccups. Essential before scaling to paid users.

---

### TIER 2 — High Impact (next sprint)

---

#### R4: Memory cache stale during active dispatch
**Problem:** `memoryCache` is keyed by `streamerId` with a 5-minute TTL. During dispatch, `upsertViewerProfile` is called fire-and-forget (`void`). Within the same 5-minute window, the next viewer's call to `getMemoryContext` gets the stale cache — missing VIP upgrades, new gift memories, etc.

**Fix:** Either invalidate the cache synchronously after any write (already done via `memoryCache.delete(streamerId)`), or change the viewer profile fetch to bypass the cache and query directly — the viewer profile data is small enough. Alternatively reduce the cache TTL to 60s for live sessions.

---

#### R5: pruneOldMemories fires only 1% of the time
**Problem:** `pruneOldMemories` is called with `Math.random() < 0.01` per `upsertViewerProfile` call. A low-traffic stream might go thousands of events without a prune. A high-traffic stream prunes often but wastes DB time.

**Fix:** Add a deterministic interval in `initOrchestrator`:
```typescript
setInterval(() => {
  // Prune for all active sessions' streamers
  for (const streamerId of state.sessionToStreamer.values()) {
    void pruneOldMemories(streamerId);
  }
}, 60 * 60 * 1000); // every hour
```
Remove the random prune from `upsertViewerProfile`.

---

#### R6: Crowd context loses individual viewer identity
**Problem:** When `batchCount > 2`, the event text becomes `"Several viewers (N) are saying: ..."`. This is correct for crowd responses, but `event.username` still holds the *first* viewer's name from the batch. The AI might address "the crowd" but then say `@viewer_p6_a`'s name specifically — a mismatch.

**Fix:** When `crowdPrefix` is applied, set `event.username` to something like `"chat"` or `"multiple viewers"` so the hostAgent doesn't use the first viewer's name in what is intended to be a crowd response.

---

#### R7: Achievement announcements bypass TTS
**Problem:** `[AI:announcer]` events (achievement unlocks, lucky drops) produce pre-formatted Ukrainian text via `announceLevelUp` but are never routed through `generateVoice`. They're text-only socket events. A streamer using voice mode hears nothing when someone unlocks "Chatterbox".

**Fix:** Route achievement announcements through the same TTS pipeline at P3 (medium) priority. Or add a lightweight announcement queue separate from the main chat queue with its own low-priority TTS slot.

---

#### R8: No queue depth visibility on frontend
**Problem:** The streamer has no idea if the AI is "backed up" (10 queued items) or idle. During high-traffic moments, the latency between an event and the AI response can grow silently.

**Fix:** In `processQueue()` or via a dedicated interval, emit `agent:queue:depth` every 5s:
```typescript
setInterval(() => {
  if (!ioRef) return;
  for (const [sessionId] of state.sessionToStreamer) {
    const depth = state.queue.filter(q => q.sessionId === sessionId).length;
    ioRef.to(`session:${sessionId}`).emit("agent:queue:depth", { depth });
  }
}, 5000);
```

---

### TIER 3 — Medium Impact (polish sprint)

---

#### R9: Battle aftermath context has no TTL
**Problem:** `recordBattleAftermath("win")` in `behaviorEngine.ts` stores a battle result with no expiry. After a battle ends, every subsequent reply for the rest of the session includes "post-battle" context. Long streams will have the AI perpetually referencing a battle from 3 hours ago.

**Fix:** Add a `battleAftermathTs` timestamp alongside the result and clear it after 10 minutes in `getStreamFatigue` or via a `cleanQueue`-style interval.

---

#### R10: Per-viewer cooldown not applied to gift/follow events
**Problem:** The `perViewerReplyCooldown` map is only checked (and set) for comment events. A viewer who gifts twice within a short window — once below the threshold (filtered) and once above — could theoretically trigger multiple responses in rapid succession if the per-gift cooldown (`announcementCooldowns["sessionId:gift"]`) resets between them.

**Fix:** After any `dispatch()` completes for a gift/follow, set `perViewerReplyCooldown` for that viewer as well. This prevents the same viewer from dominating the AI's attention across event types.

---

#### R11: In-memory state lost on server restart mid-stream
**Problem:** `state.queue`, `state.conversationHistory`, `state.announcementCooldowns`, emotionEngine/behaviorEngine/moodEngine state — all in-memory. A deploy or crash during a live stream wipes everything. Recovered sessions start cold (no emotion state, no conversation history, announcement cooldowns reset to zero).

**Recommendation:** For v2, persist critical state to Redis with short TTLs:
- `announcementCooldowns`: 30-min TTL (prevents duplicate announces after restart)
- `conversationHistory`: 10-min TTL per session (keeps thread context)
- Emotion/mood state: 30-min TTL

The current behavior (cold restart) is acceptable for v1 but will feel broken to streamers who restart the server during a live session.

---

#### R12: Strategy coach fires every 5 minutes regardless of stream activity
**Problem:** `STRATEGY_COOLDOWN = 5 * 60 * 1000` triggers suggestions every 5 minutes unconditionally. For a slow stream with minimal events, the strategy agent fires on sparse data and produces low-quality suggestions ("try asking a question") that aren't meaningfully better than defaults.

**Fix:** Add a minimum-activity gate: only generate a strategy suggestion if `entry.metrics.totalComments > 5` since the last suggestion, or `entry.recentEvents.length > 10`. This ensures the model has enough signal to reason from.

---

### TIER 4 — Architecture (long-term roadmap)

---

#### R13: Single OpenAI client dependency
All AI agents depend on the same OpenAI API key. If the key hits rate limits or is revoked, the entire system goes dark. Consider:
- Fallback to a secondary key (separate env var `AI_FALLBACK_KEY`)
- Circuit breaker pattern: after 3 consecutive errors, queue-pause for 30s and log prominently
- Response caching for common follow/gift phrases as ultra-fast fallback

---

#### R14: No A/B testing framework for personality modes
The learning agent adjusts personality based on performance, but there's no way to test two modes head-to-head. Consider a simple flag in `ai_persona_configs`:
```
abTestMode: "control" | "variant_a" | null
```
The learning agent could track scores separately per test arm and surface the winner after N sessions.

---

#### R15: Audience segmentation not used
`agentViewerProfilesTable` tracks VIP levels (none/gifter/regular/vip) but the orchestrator only uses this for priority classification. Consider:
- **Gifters**: reference their most recent gift in the reply context ("whale_gifter who just sent that Galaxy")
- **Regular commenters (20+ comments)**: acknowledge loyalty occasionally ("always good to see you in here")
- **New viewers (first_timer)**: the existing first-timer emotion trigger is correct, but the follow-up comment from the same new viewer doesn't get the same treatment — they're treated as regular on the second message

---

## Summary Table

| Rank | Issue | Effort | Impact | Priority |
|------|-------|--------|--------|----------|
| R1 | TTS overlap on fast events | Low | High | 🔴 Critical |
| R2 | Learning agent coaching loop broken | Medium | High | 🔴 Critical |
| R3 | No retry on OpenAI calls | Low | High | 🔴 Critical |
| R4 | Memory cache stale during dispatch | Low | Medium | 🟠 High |
| R5 | Memory prune is probabilistic | Low | Medium | 🟠 High |
| R6 | Crowd context drops viewer identity | Low | Medium | 🟠 High |
| R7 | Achievement announces have no TTS | Medium | Medium | 🟠 High |
| R8 | No queue depth on frontend | Low | Medium | 🟡 Medium |
| R9 | Battle aftermath has no TTL | Low | Low | 🟡 Medium |
| R10 | Per-viewer cooldown not on gift/follow | Low | Low | 🟡 Medium |
| R11 | In-memory state lost on restart | High | High | 🟡 Medium (v2) |
| R12 | Strategy coach fires on sparse data | Low | Low | 🟢 Low |
| R13 | Single OpenAI key dependency | High | High | 🟢 Low (v2) |
| R14 | No A/B personality testing | High | Medium | 🟢 Low (v2) |
| R15 | Audience segmentation underused | Medium | Medium | 🟢 Low (v2) |

**Immediate action items (R1–R3)** can each be implemented in under an hour and will have the largest per-effort impact on live stream quality and reliability.
