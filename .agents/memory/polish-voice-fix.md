---
name: Polish voice fix — Storm TTS
description: Root causes and fix for Polish voice interrupting Storm's TTS on Windows; Storm's voice is now fixed (never language-dependent).
---

## Rule
Storm has exactly one fixed voice. The TTS voice NEVER switches based on what language the reply text is in.

## Root causes (3 independent paths that each triggered Polish)

1. **`detectTtsLang()` → `pl-PL`** — when Storm replied to a Polish viewer, the text contained Polish diacritics (`ąęóśźżćłń`). `detectTtsLang` returned `pl-PL`, then `selectBrowserVoice("pl-PL")` explicitly selected "Google Polish" (or "Microsoft Paulina Polish").

2. **Windows OS double-voice bug** — if `utt.lang` ≠ `utt.voice.lang`, Windows plays both the assigned voice AND the system-default voice (often "Microsoft Adam Polish") in parallel. This caused audible overlap even when the wrong voice wasn't intentionally selected.

3. **OpenAI TTS 3 fallback paths to `playBrowserTts(rawText)`** — every OpenAI error (HTTP error, `audio.onerror`, `play() rejected`) called `playBrowserTts(rawText)` without a `defaultLang`. That lost language context → `detectTtsLang` could return `pl-PL` → Polish voice selected.

## Fix (in `useLiveSession.ts`)

- **`selectStormVoice()`** — new function, returns best available voice from priority chain: `uk-UA > uk > ru-RU > ru > en-US > en > any non-Polish`. Polish voices are permanently excluded. Used for ALL browser TTS output regardless of text language.

- **`playBrowserTts()`** — now uses `selectStormVoice()` instead of `selectBrowserVoice(detectedLang)`. If no suitable voice found → `resolve()` and return (never lets OS pick its default). `utt.lang` is always set to `stormVoice.lang` (not detectedLang) to prevent the Windows double-voice bug.

- **`playOpenAiTts()` — ALL browser fallbacks removed**. Every error path now just logs and returns. No path to `playBrowserTts` remains.

- **`currentAudioElement`** — module-level ref tracking the active OpenAI `Audio` object so `stopAllSpeechNow()` can cancel it.

- **`stopAllSpeechNow()`** — calls `speechSynthesis.cancel()` + pauses current audio + resets `ttsQueue` + emits `tts:queue { depth: 0 }`.

## Exposed from hook

`stopAllSpeech`, `clearSpeechQueue`, `activeVoiceName`, `ttsQueueLen` — all wired into Live Studio sidebar "Storm's Voice" card.

**Why:** On Windows, browser voices include Polish system voices (Microsoft Adam/Paulina) that get selected by default when the utterance language is Polish — or when `utt.lang` mismatches `utt.voice.lang`. Storm's voice must be fixed, not language-adaptive.
