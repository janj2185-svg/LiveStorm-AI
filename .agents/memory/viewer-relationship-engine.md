---
name: Viewer Relationship Engine
description: Architecture of the two-tier viewer memory system (rule-based tags + GPT facts) and Viewer Card format injected into hostAgent.
---

## Architecture

Two-tier hybrid approach approved by user:
1. **Rule-based tags** (always free, runs on every comment/gift/follow/like)
2. **GPT fact extraction** (only when personal fact signal detected; 15-min throttle per viewer; 30-call/stream cap)

## New DB columns on `agent_viewer_profiles`
`mood`, `personalityTags` (comma-separated string), `typicalHour` (int, rolling avg), `streakDays`, `totalCoinsSpent`, `lastGiftName`

## Key files
- `artifacts/api-server/src/agents/viewerPersonalityTagger.ts` — rule-based tag detection
- `artifacts/api-server/src/agents/viewerFactExtractor.ts` — GPT extraction with throttle
- `artifacts/api-server/src/agents/memoryAgent.ts` — main memory agent; `buildViewerCard()` + `upsertViewerProfile()`

## Viewer Card format (injected into hostAgent via memoryContext)
```
=== VIEWER: Jan ===
48d · 8 gifts · 230 comments · loyal · joker · battle_fan
Mood: playful · Visits: ~21:00
Known: loves dark humor; from Kyiv; roots for streamer in battles
Last seen: 3h ago
RECALL: Jan is someone you know — weave ONE relevant detail naturally into your reply.
===
```

## Cache fix
`genericMemoryCache` in `agents/memoryAgent.ts` caches ONLY global/stream/joke/preference memories per streamerId. Viewer cards are always fetched fresh (no cache) to prevent cross-viewer contamination.

## Orchestrator merge logic
```typescript
const hasViewerCard = rawMemoryCtx.startsWith("=== VIEWER:");
const memoryCtx = hasViewerCard ? rawMemoryCtx : [viewerCtx.contextSummary, rawMemoryCtx].filter(Boolean).join("\n");
```

**Why:** When Viewer Card is present it already contains all viewer-specific context; the lib agent's flat summary would duplicate it.

## Personality tags
- **Text-based** (from comment): joker, battle_fan, playful, supportive
- **Stats-based** (from profile): loyal_supporter (comments≥30 or gifts≥2+comments≥10), gifter_champion (gifts≥5 or coins≥2000)
- **Mood** (ephemeral, per-comment): toxic → negative; joker/playful → playful; supportive → positive

## GPT fact extraction
- Signal patterns check runs first (location, age, job, birthday, schedule, interest)
- Ephemeral patterns filter (`zараз`, `іду`, `brb`, etc.) prevent false positives
- 15-min throttle per `streamerId:viewerName` key
- 30-call cap per stream (tracked in memory, not DB)
- Facts stored as `viewer` type memories in `ai_memories` table
