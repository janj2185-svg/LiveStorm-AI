---
name: Orchestrator wiring requirements
description: Two missing wires that caused the agentOrchestrator to silently do nothing at runtime
---

## The rule

`agentOrchestrator.ts` has TWO wiring points that MUST both be present or every event silently drops:

1. **`initOrchestrator(io)`** must be called inside `initSocketServer()` in `socketServer.ts`.  
   Without this, `ioRef` stays `null` and `enqueueEvent()` returns immediately at `if (!ioRef) return`.

2. **`orchestratorEnqueue(event, streamerId)`** must be called from `ingestLiveEvent()` in `socketServer.ts`.  
   Without this, events never enter the orchestrator queue regardless of whether `ioRef` is set.

Both are now in place in `socketServer.ts` (import + call in `initSocketServer`, `void orchestratorEnqueue(...)` in `ingestLiveEvent`).

**Why:** The orchestrator was built as a separate module from the socketServer's own direct AI reply path. The two systems run in parallel — socketServer's path fires `[AI:*]` logs; the orchestrator fires `[Agent:*]` logs. Both call OpenAI independently for each comment (double cost). Unifying them into one path is a future refactor.

**How to apply:** Any time orchestrator logs (`[Orchestrator] ⚡ dispatch`, `[Agent:Memory]`, etc.) are absent after injection, check these two wiring points first before looking for bugs in the agent logic itself.

## Additional notes

- `logTask` had `.catch(() => {})` that silently ate all DB errors. Now logs with `[Agent:TaskLog] DB insert failed:`.
- `ai_persona_configs` row must exist for the streamer (dispatch returns early at `if (!config) return` on line ~143). Row for streamer_id=4 exists (id=1, persona_name=Storm).
- Both systems running in parallel means each comment generates TWO OpenAI calls — one from socketServer's `generateCommentReply`, one from orchestrator's `runHostAgent`. This is intentional for now (separate reply channels) but is a cost concern at scale.
