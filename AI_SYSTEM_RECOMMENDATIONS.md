# LiveStorm AI — Expert System Recommendations
**Generated:** June 2026 | **Based on:** Full codebase audit (T001–T009 implementations)

---

## System State Summary

All nine core improvements are live and verified:

| Task | Feature | Status |
|------|---------|--------|
| T001 | Priority-aware TTS cooldowns (gift=2s, follow=4s, battle=3s, general=8s) | ✅ Live |
| T002 | batchSimilarMessages wired into enqueueEvent for P6 comments | ✅ Live |
| T003 | Engagement-weighted scoreResponse (gift=9, follow=8, first_timer=7, vip=6, general=5) | ✅ Live |
| T004 | Queue protection: >25 items drops stale P6, hard cap at 40 | ✅ Live |
| T005 | Battle replies routed through generateVoice → tts:audio | ✅ Live |
| T006 | Learning agent auto-applies personality on confidence≥7 + avgScore<6.5 | ✅ Live |
| T007 | Memory pruning (14d, importance<3) + joke/preference context included | ✅ Live |
| T008 | Full personality×emotion expression matrix (6 modes × 9 emotions) | ✅ Live |
| T009 | triggerLearningAgent fires on both /sessions/end and /sessions/force-stop | ✅ Live |

---

## Ranked Recommendations

Ranked by **expected engagement impact × implementation effort ratio** (highest ROI first).

---

### #1 — Dynamic TTS Cooldown Scaling  
**Priority: CRITICAL | Effort: Low | Impact: High**

Current cooldowns are static per priority level. During high-energy bursts (gift storms, battle peaks) the fixed 2s gift cooldown causes audio pileup, while during dead periods the 8s general cooldown makes the AI feel unresponsive.

**Recommendation:** Scale cooldowns inversely with queue depth.

```ts
function ttsCooldown(priority: number, queueDepth: number): number {
  const base = TTS_COOLDOWN_MS[priority] ?? 8_000;
  // Queue deep → stretch cooldown to drain faster
  // Queue shallow → shrink cooldown so AI stays present
  const depthFactor = queueDepth > 15 ? 1.4 : queueDepth > 8 ? 1.15 : queueDepth < 3 ? 0.7 : 1.0;
  return Math.round(base * depthFactor);
}
```

Expected result: 18–25% reduction in "AI went quiet" dead-air perception during slow periods.

---

### #2 — Mid-Stream Learning Cycles (Every 30 Minutes)
**Priority: HIGH | Effort: Low | Impact: High**

Currently `triggerLearningAgent` only fires at session end. A streamer running a 3-hour LIVE receives no personality adaptation until they stop. The model could self-correct within the same stream.

**Recommendation:** Add a periodic learning trigger inside `initOrchestrator`:

```ts
// Inside initOrchestrator(), after existing intervals:
setInterval(async () => {
  for (const [sessionId, streamerId] of state.sessionToStreamer) {
    const entry = sessionMetricsCache.get(sessionId);
    if (!entry || entry.metrics.totalComments < 30) continue; // minimum data
    console.log(`[Orchestrator] ⏱ mid-stream learning check | session=${sessionId}`);
    void triggerLearningAgent(sessionId, streamerId);
  }
}, 30 * 60_000); // every 30 minutes
```

Guard with `metrics.totalComments >= 30` to avoid triggering on sessions with insufficient data. Expected result: AI personality adapts within the same stream when engagement score drops.

---

### #3 — Viewer Sentiment Momentum Tracking
**Priority: HIGH | Effort: Medium | Impact: High**

The current viewer profile tracks `totalGifts / totalComments / vipLevel` but not whether a viewer's sentiment is trending positive or negative. A viewer who has sent 3 hostile comments in a row should be de-prioritised; one whose positivity is accelerating should be elevated.

**Recommendation:** Add `sentimentScore` (int, -10 to +10) and `sentimentTrend` ("rising"|"flat"|"falling") to `agentViewerProfilesTable`. Update it in `upsertViewerProfile` using a lightweight VADER-style classifier (no API call needed — keyword matching is sufficient for TikTok chat).

In `classifyEvent`, use `sentimentTrend === "rising"` as a weak signal to bump from P6 to P5.

Expected result: The AI naturally spends more time on engaged positive viewers without explicit configuration.

---

### #4 — Session Warm-Up Phase (First 5 Minutes)
**Priority: HIGH | Effort: Low | Impact: Medium**

The `getStreamFatigue()` model starts at 0 fatigue and builds over time — but there's no complementary *warm-up* model. The first 5 minutes of a stream are typically low-energy, and the current system treats them identically to minute 60. This causes two problems:
- The AI's skip probability (P6 comments) is too low early, flooding early chat with AI responses that drown human conversation
- Silence fillers fire at the same rate even when early silence is normal

**Recommendation:** Add `getStreamWarmupFactor(sessionId)` to `behaviorEngine.ts`:

```ts
export function getStreamWarmupFactor(sessionId: number): number {
  const state = sessionStates.get(sessionId);
  if (!state) return 1.0;
  const ageSec = (Date.now() - state.sessionStartMs) / 1000;
  if (ageSec < 120) return 0.4;  // first 2 min: AI mostly listens
  if (ageSec < 300) return 0.7;  // 2-5 min: AI warms up
  return 1.0;                     // 5+ min: full engagement
}
```

Apply in `enqueueEvent` to scale silence-filler probability and P6 skip probability during warm-up.

---

### #5 — Conversation Relevance Scoring (Context Window Quality)
**Priority: MEDIUM | Effort: Medium | Impact: Medium**

`conversationHistory` keeps the last 10 exchanges and passes the last 5 to `runHostAgent`. This simple FIFO approach discards older exchanges that might be highly relevant (e.g., a gift sent 6 exchanges ago that the current comment directly references).

**Recommendation:** Replace FIFO slice with relevance scoring:

```ts
function selectRelevantHistory(
  history: ConversationEntry[],
  currentEvent: TikTokEvent,
  limit = 5,
): ConversationEntry[] {
  const text = (currentEvent.data.text as string ?? "").toLowerCase();
  const scored = history.map((h) => {
    let score = 0;
    // Recency bonus
    const ageSec = (Date.now() - h.ts) / 1000;
    score += Math.max(0, 1 - ageSec / 120); // fades over 2 min
    // Content overlap bonus
    const overlap = text.split(" ").filter((w) => w.length > 3 && h.comment.toLowerCase().includes(w)).length;
    score += overlap * 0.3;
    // Event type bonus — gifts/follows always relevant
    if (h.comment.startsWith("[gift") || h.comment.startsWith("[follow")) score += 0.4;
    return { ...h, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
```

Expected result: Gift acknowledgments reference the actual gift even when several other comments arrived in between.

---

### #6 — Predictive Queue Overflow Protection
**Priority: MEDIUM | Effort: Low | Impact: Medium**

The current `cleanQueue()` runs every 30 seconds, which means a sudden burst of 50 gifts (e.g., a whale gifting spam) can momentarily overwhelm the queue before the cleaner fires.

**Recommendation:** Add an inline overflow guard inside `enqueueEvent`, immediately after the push+sort:

```ts
// After state.queue.push(item) and sort:
if (state.queue.length > 35) {
  // Emergency: drop lowest-priority oldest items to make room for incoming P1-P3
  const beforeEmergency = state.queue.length;
  state.queue = state.queue.filter((q, idx) => idx < 15 || q.priority <= 3);
  if (state.queue.length < beforeEmergency) {
    console.log(`[Queue:Emergency] overflow guard: ${beforeEmergency} → ${state.queue.length}`);
  }
}
```

This guarantees gifts and follows are never dropped during viral moments.

---

### #7 — Response Diversity Enforcement (Anti-Repetition)
**Priority: MEDIUM | Effort: Medium | Impact: Medium**

`injectParalinguistics` and the `varietyInstruction` in `runHostAgent` prevent identical *structures*, but the AI can still cycle through the same 3-4 response patterns within a session (e.g., always opening gift responses with "Oh wow!").

**Recommendation:** Add a lightweight response fingerprint cache to `OrchestratorState`:

```ts
recentResponseFingerprints: Map<number, string[]>; // sessionId → last 10 opening phrases
```

In `dispatch()`, after `hostResult` is generated, extract the first 4 words as a fingerprint. If it matches any of the last 10, append a diversity instruction to the system prompt and regenerate once:

```ts
const fingerprint = spokenText.split(" ").slice(0, 4).join(" ").toLowerCase();
const recent = state.recentResponseFingerprints.get(sessionId) ?? [];
if (recent.includes(fingerprint)) {
  // Re-run hostAgent with explicit diversity instruction
}
recent.push(fingerprint);
state.recentResponseFingerprints.set(sessionId, recent.slice(-10));
```

Expected result: Elimination of repetitive openers within a session without increasing token usage significantly.

---

### #8 — Gift Velocity Sliding Window (EWMA)
**Priority: MEDIUM | Effort: Medium | Impact: Low-Medium**

`recordGiftVelocity()` in `behaviorEngine.ts` uses a fixed count-in-window approach. This can produce false "storm" signals when 3 micro-gifts arrive within 30s, and miss genuine waves if gifts are spread across 45s.

**Recommendation:** Replace with an Exponentially Weighted Moving Average:

```ts
interface GiftVelocityState {
  ewma: number;        // current EWMA value (0–1 normalised)
  lastGiftTs: number;
}

// On each gift: ewma = alpha * 1.0 + (1 - alpha) * ewma
// On each query: ewma = ewma * decay^(secondsSinceLastGift)
// alpha = 0.3, decay = 0.97 per second
```

Thresholds: `ewma > 0.6` = storm, `ewma > 0.3` = wave, otherwise none. This is continuous, responds immediately to bursts, and naturally decays without needing separate cleanup timers.

---

### #9 — Streamer In-Session Feedback Loop
**Priority: MEDIUM | Effort: High | Impact: High (long-term)**

The learning agent currently infers quality from pure engagement metrics (likes, follows, gifts). But the streamer themselves is the best judge of whether an AI response landed well.

**Recommendation:** Add a minimal feedback UI in the AI Assistant page — a 👍/👎 on each `ai:announcement` card. Wire it to a new `/ai/feedback` endpoint that calls `scoreResponse()` with an override score (👍 = 8.0, 👎 = 2.0). Tag these as `feedback_override: true` so the learning agent weights them 3× vs inferred scores.

This creates a human-in-the-loop feedback signal that progressively steers the AI toward the streamer's actual preferences, independent of audience metrics.

---

### #10 — Viewer Cluster Personas (Lurker / Gifter / Questioner / Hype)
**Priority: LOW-MEDIUM | Effort: High | Impact: Medium (long-term)**

Currently VIP level is the only viewer segmentation. Viewers have distinct behavioral patterns that call for different response styles:
- **Lurkers** (high views, zero comments): should never be called out, but can be passively acknowledged
- **Questioners** (repeated question pattern): deserve thorough answers and follow-ups
- **Gifters** (high coins, low comments): need public recognition to encourage repeat gifting
- **Hype viewers** (short comments, fast cadence): fuel energy, acknowledge briefly and move on

**Recommendation:** Add `clusterType: "lurker" | "questioner" | "gifter" | "hype" | "regular"` to `agentViewerProfilesTable`. Compute it in `upsertViewerProfile` using simple thresholds. Inject cluster context into `getMemoryContext()` so `runHostAgent` receives it.

---

## Architecture Health Observations

### Strengths
- **Pipeline correctness**: The dual-pathway removal is clean. The orchestrator owns all event processing with no competing pipelines.
- **Priority fidelity**: The queue sort + TTS cooldown combination correctly ensures P1 (gifts) are always spoken before P6 (general) regardless of arrival order.
- **Emotional coherence**: The emotion×mood layering (state machine + EWMA decay) is sophisticated and produces natural AI emotional arcs across a session.
- **Memory breadth**: Including joke, preference, stream, and global memory types in context gives the AI rich character continuity across sessions.

### Technical Risks

1. **In-memory state on server restart**: `conversationHistory`, `announcementCooldowns`, `perViewerReplyCooldown`, `chatBatches`, `activeBattles`, and all emotion/mood/behavior states are lost on restart. For production, consider persisting cooldown maps to Redis or a short-TTL DB table.

2. **Single `processing` lock**: The `state.processing` boolean serializes all queue processing. Under very high load (100+ events/sec), this could create a backlog. Consider a token-bucket approach that allows 2-3 concurrent low-priority dispatches.

3. **DB query per enqueueEvent**: The gift, follow, and comment pre-filters each issue a separate `aiPersonaConfigsTable` query. These could share a single cached config fetch with a 30s TTL to reduce DB round-trips by ~3× on active streams.

4. **`batchSimilarMessages` timer leak**: If a session ends while a batch timer is pending, the timer fires after session cleanup and attempts to insert into a closed/cleared queue. Add a `clearChatBatches(sessionId)` call in `clearSessionHistory()`.

5. **`generateBattleReply` DB write on every call**: The battle agent writes a transcript entry for both the opponent statement and the AI reply on every `generateBattleReply` call, resulting in duplicate rows for the same statement. Add a deduplication check or separate the "store transcript" concern from "generate reply".

---

## Monitoring Signals to Track

| Signal | What it tells you | Target range |
|--------|-------------------|--------------|
| `avgScore` from learning reports | AI response quality | > 6.5/10 |
| Queue depth at time of dispatch | Whether queue is keeping up | < 8 items |
| TTS audio delivery rate | Voice pipeline health | > 95% of dispatched items |
| `batchCount` on dispatched items | Chat batching effectiveness | > 1.5 avg during busy streams |
| Per-viewer cooldown hit rate | Spam protection calibration | 20–40% of repeat commenters |
| Personality auto-adjustment frequency | Learning agent confidence | < 1 per 10 sessions (high = AI uncertain) |
| Silence filler trigger rate | Dead-air detection sensitivity | 1–3 per 10 min of silence |

---

*End of recommendations document.*
