---
name: OpenAI TTS autoplay unlock
description: Chrome blocks audio.play() triggered by socket events; page must be "activated" by a user gesture first.
---

## Rule
Never call `audio.play()` without first unlocking autoplay via a user click.

## Why
Chrome's autoplay policy blocks `audio.play()` unless the page has been "activated" — meaning a user gesture (click/touch) has occurred. TTS fires from `socket.on("ai:announcement")` which has zero gesture context. The play() promise rejects with `NotAllowedError: play() failed because the user didn't interact with the document first`.

## How to apply
- `unlockAudio()` in `useLiveSession.ts` plays a 1-frame silent `AudioContext` buffer from a click handler — this satisfies Chrome's activation requirement for the life of the page session.
- `audioUnlocked` (module-level bool) + `isAudioUnlocked` (React state synced via `tts:audio:unlocked` window event) track state.
- The "🔊 Enable Voice Output" button in `live-studio.tsx` Voice Control card calls `unlockAudio()` and is only shown when `mode=openai && !isAudioUnlocked`.
- After a single button click, ALL subsequent `audio.play()` calls (including socket-triggered ones) succeed for that page session.
- The numbered step logs `[TTS:3]` through `[TTS:10]` in `playOpenAiTts` pinpoint exactly where failures occur: step 3=entry, 4=fetch, 5=HTTP status, 6=buffer size, 7=window event, 8+9=Audio element, 10=play() result.
