---
name: iOS SpeechRecognition continuous=false
description: iOS Safari webkitSpeechRecognition silently fails when continuous=true — the classic "mic works, no transcript" bug on iPhone.
---

## The Rule
Always use `continuous=false` + `interimResults=false` on iOS Safari, same as Android Chrome.

**Why:** iOS Safari's `webkitSpeechRecognition` accepts `continuous=true` without error, fires `onstart` (shows "Listening"), and getUserMedia works (audio meter moves) — but `onresult` NEVER fires. There is no error, no warning. The session silently times out and `onend` fires. This is a known WebKit limitation, undocumented in MDN.

**How to apply:** Use `IS_MOBILE_SR = IS_ANDROID || IS_IOS` as the gate for:
- `rec.continuous = !IS_MOBILE_SR`
- `rec.interimResults = !IS_MOBILE_SR`
- Immediate flush on final result (no silence timer)
- 600ms restart delay on `onend`

Detection: `IS_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)`

The "audio meter works but no transcript" symptom is diagnostic for this bug on iOS.
