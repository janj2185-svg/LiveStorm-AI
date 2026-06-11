---
name: Dual pipeline removal
description: How processAiAnnouncements was disabled and its unique logic preserved in the orchestrator
---

## The fix

`DISABLE_OLD_PIPELINE=true` (env var, development scope) gates the `processAiAnnouncements` call in `socketServer.ts` line 596.

## Unique logic migrated into agentOrchestrator.ts enqueueEvent

1. **Like milestones** — `state.sessionLikeTotals` tracks cumulative likes per session; only enqueues when a 100-like boundary is crossed.
2. **Gift threshold** — reads `config.announceGiftThreshold` + `config.announceGifts`; suppresses below-threshold gifts before they reach the queue.
3. **Cooldowns** — `state.announcementCooldowns` Map with gift=30s, share=45s, follow=60s, like_milestone=120s per session.
4. **Follow flag** — checks `config.announceLevelUp` before enqueueing follow events.
5. **fastSpamCheck** — called on every comment before classifyEvent; emits `moderation:flagged` on hit.
6. **Per-viewer reply cooldown** — `state.perViewerReplyCooldown` set in dispatch after each comment reply; checked in enqueueEvent using `config.spamCooldownSeconds`.

## Proof markers
- Every `ai:announcement` event carries `pipeline: "orchestrator"` field.
- Server startup logs `[Pipeline] ✅ DISABLE_OLD_PIPELINE=true` or `⚠️ DUAL pipeline ACTIVE`.
- Per-event: `[OLD-PIPELINE] DISABLED` / `[NEW-PIPELINE] orchestratorEnqueue`.

**Why:** Two AI systems were both generating and emitting responses for every event. Double score rows, bypassed TTS cooldowns, learning agent trained on polluted data.

**How to apply:** If flag needs to be reverted, set `DISABLE_OLD_PIPELINE=false` or delete the env var. The old function body is preserved in socketServer.ts until a future cleanup task deletes it.
