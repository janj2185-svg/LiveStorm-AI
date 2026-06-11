---
name: Browser TTS pause bug & queue deadlock
description: Chrome speechSynthesis silently stops when tab loses focus; ttsQueue deadlocks if onend never fires
---

## The Rule
`window.speechSynthesis.speak()` silently queues utterances without playing them when:
1. The tab was backgrounded (Chrome pauses synthesis on visibility loss)
2. No user gesture on the page (first call blocked by autoplay policy)

`ttsQueue` (module-level Promise chain in useLiveSession.ts) deadlocks permanently when any single `playBrowserTts` call never resolves — all subsequent calls wait forever.

## Symptoms
- Browser console shows repeated `[TTS] → enqueuing Browser Speech API` lines
- Zero `tts:start`, `tts:end`, or error logs follow
- Audio is completely silent despite full backend chain working correctly

## Diagnosis path
Backend chain confirmed via server logs: TikTok → TikTools → socketServer → orchestrator → hostAgent → `ai:announcement` emitted → frontend receives it → `mode=browser` → `enqueueTts()` called. Break is inside `speechSynthesis.speak()`.

## Fix (applied in useLiveSession.ts)
1. Call `synth.resume()` before `synth.speak(utt)` when `synth.paused` is true
2. Add 12s safety timeout in `playBrowserTts` — always resolves, prevents deadlock
3. In `enqueueTts()`: detect `synth.paused` before adding to chain → reset `ttsQueue = Promise.resolve()` + call `resume()`
4. Added `[TTS:Browser] ▶ playing / ✓ done / ✗ error:` console logs for future diagnosis

**Why:** Chrome pauses synthesis on tab switch. Streamers use LiveStorm on a second screen/tab while TikTok is in focus → synthesis always paused → queue always deadlocked.

## Also found
`voice_enabled = false` in `ai_persona_configs` DB → backend never generates `tts:audio` events. This is independent of browser TTS path. User controls via AI Assistant > Voice settings toggle.
