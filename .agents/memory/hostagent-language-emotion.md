---
name: hostAgent language + emotion fixes
description: Root causes and fixes for Storm replying in wrong language and sounding emotionally flat.
---

## Language bugs (all three must stay fixed)

**Bug 1 — Language code passed raw to LLM**
`config.replyLanguage` is stored as short codes ("uk", "pl", "en").
Passing them directly produces "Always respond in uk." which GPT ignores.
Fix: `LANGUAGE_NAMES` map in `hostAgent.ts` converts codes → full names before building the prompt.

**Bug 2 — defaultLanguage never used in auto-mode fallback**
The auto-mode instruction hardcoded "Only fall back to Ukrainian".
Fix: `runHostAgent` now accepts `defaultLanguage?: string`; `agentOrchestrator.ts` passes `config.defaultLanguage ?? "uk"`; the instruction uses `LANGUAGE_NAMES[defaultLanguage]` as the fallback name.

**Bug 3 — Soft language hint ignored for Cyrillic without Ukrainian-specific letters**
Comments like "ех хто заходить поставте лайк" have no іїєґ → GPT can't distinguish Ukrainian from Russian → defaults to English (its system-prompt language).
Fix: Replace the single-line hint with a multi-line rule table:
```
LANGUAGE RULE (NON-NEGOTIABLE):
- Cyrillic → reply in Ukrainian (the fallback language)
- Polish diacritics → reply in Polish
- English → reply in English
- DO NOT reply in English unless the viewer clearly wrote in English
```

**Why:** GPT-4o-mini with an all-English system prompt will default to English unless the language instruction is framed as an explicit non-negotiable rule table, not a soft suggestion.

## Emotion flatness fixes

**Prompt order:** `emotionSection` (voice & delivery) moved to position 5 (just before `varietyInstruction`). Being near the end of the system prompt means the model pays more attention to it. Previously it was at position 2 and got buried.

**User prompt enrichment:** Gift events now include a tier label (`[LEGENDARY gift — absolutely insane]`, `[MASSIVE gift — wow]`, etc.). Follow/share/like events include context signals. Previously a 1000-coin gift and a 5-coin gift looked identical to the LLM.

**Temperature raised:** 0.80→0.85 default, gifts/follows→0.88, emotion intensity≥6→0.92, ≥8→0.96. This allows more expressive word choices.

**max_tokens raised:** follow 38→52, gift 60→68/78/90 (tiered), silence 58→72, comments ~+8 tokens. Short budgets left no room for emotional variation.

## Browser TTS voice quality ("sounds Polish") fix

Browser TTS `lang=uk-UA` but no Ukrainian voice installed → browser picks any voice, often `pl-PL` (nearest Slavic in Chrome on Linux/Windows).

Fix: `selectBrowserVoice(lang)` in `useLiveSession.ts`:
1. Exact match (`uk-UA`)
2. Partial match (`uk-*`)
3. Configured fallback chain: `"uk-UA": ["uk", "ru-RU", "ru"]` (Russian is closer phonetically than Polish)
4. Logs which voice was selected or if fallback was used

Also: `playBrowserTts` now accepts `{ rate, emotion }` opts; emotion-aware rate/pitch (excited/hype → +0.08 rate, higher pitch); uses `ttsSpeedRef.current` instead of hardcoded 1.1.

## Debugging aids added
- `[HostAgent:lang]` — logs replyLang code→name mapping and fallback language per dispatch
- `[HostAgent:params]` — logs event, emotion state/intensity, maxTokens, temperature per dispatch
- `[TTS:Browser]` — now logs selected voice name; logs all available voices on first TTS; warns on fallback
