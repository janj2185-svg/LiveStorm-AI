---
name: Recognition Engine wiring — profile source and date coercion
description: Three bugs found during pipeline verification of the AI Recognition Engine; critical for any future work touching viewer profiles in the orchestrator.
---

## Rule
Recognition Engine in agentOrchestrator.ts must use `getViewerContextForRecognition()` (from `agents/memoryAgent.ts`), NOT `viewerCtx.profile`/`viewerCtx.memories` from `getViewerContext()` (lib).

## Why
`getViewerContext()` (lib/agents/memoryAgent.ts) returns a **minimal** profile object that omits `firstSeen` and `lastSeen`, and returns memories as `string[]` (values only, no keys). The recognition engine requires date fields for tier classification and keyed memories for the privacy filter. Using the wrong source caused: wrong tier (epoch date → absent_30d instead of absent_7d), memoriesUsed=0, and incorrect lastSeenLabel.

## How to apply
Any new code that calls `buildRecognitionInjection()` must source its `profile` and `memories` from `getViewerContextForRecognition(streamerId, viewerName)` which returns `{ profile: fullDbRow | null, memories: Array<{key, value}> }`.

---

## Rule
All `.getTime()` calls on dates from Drizzle must be wrapped with `toDate()`.

## Why
Drizzle returns PostgreSQL `timestamp without time zone` columns as strings in the format `"2026-06-03 16:28:44.428817"` (space not T, microseconds with 6 decimal places). `new Date("2026-06-03 16:28:44.428817")` returns `Invalid Date` in Node.js v24 → `.getTime()` → NaN → epoch fallback → wrong tier (56yr ago).

## How to apply
In recognitionEngine.ts the `toDate(v)` helper coerces `Date | string | number | undefined | null → Date`. All four call sites (formatLastSeen, classifyRecognitionTier, deriveTitleHint, buildPrompt) use it. Apply the same pattern to any new engine that does date arithmetic on Drizzle-sourced timestamps.

---

## Rule
`buildViewerCard` (agents/memoryAgent.ts) must filter private keys before building the `Known:` line.

## Why
Without the filter, private memories (phone, email, salary, address) seeded in `ai_memories` were passed directly into the ViewerCard injected into the host agent's context — exposing them to the AI and potentially to the stream.

## How to apply
The `PRIVATE_KEYS_VC` array in `buildViewerCard` mirrors `PRIVATE_KEYS` in recognitionEngine.ts. If you extend the blocklist in one place, extend it in both.
