---
name: LiveStorm Bug Fixes
description: Root causes and fixes for critical bugs found in the LiveStorm AI live workflow
---

# OBS Token 404
**Root cause:** `obs.ts` had a module-level `throw` if `CLERK_SECRET_KEY` was missing. Even though the key IS set in prod, the throw pattern is fragile and caused the route to return 404 in some restart sequences (old compiled binary + new routes not matching).
**Fix:** Moved to a lazy `getObsTokenSecret()` function called inside the route handler. Returns 500 on failure, not crash.
**Why:** Module-level throws crash the entire routes/index.ts import chain, making all routes on that router unregistered.

# Overlays.tsx Clerk Timing
**Root cause:** `fetchToken()` was called in `useEffect([], [])` — fires before Clerk is initialized, `getToken()` returns null, request sent with `Authorization: Bearer null`.
**Fix:** Added `isLoaded` and `isSignedIn` from `useAuth()`, changed useEffect dep array to `[isLoaded, isSignedIn]`.

# FormLabel Outside FormField
**Root cause:** `settings.tsx` used `<FormLabel>Email Address</FormLabel>` outside a `<FormField>` context at line 151. This calls `useFormField()` hook outside its context provider, crashing with "Invalid hook call".
**Fix:** Replaced `FormLabel` with `Label` (from `@/components/ui/label`) with explicit `htmlFor` attribute.
**Why:** `FormLabel` from shadcn/ui form.tsx is a wrapper that calls `useFormField()` which requires being inside `<FormField render={...}>`.

# Sessions Mode Bug
**Root cause:** `sessions.ts` line 45: `let actualMode = demoMode ? "demo" : "demo"` — always "demo". Dead code since `startTikTokConnection()` return value overwrites it on line 50, but misleading.
**Fix:** Changed to `demoMode ? "demo" : "live"`.

# API Server Build Pattern
The api-server uses `build && start` (NOT tsx watch). Code changes require a manual workflow restart to take effect. The build uses esbuild (build.mjs). TypeScript type errors would fail the build — prefer runtime type narrowing for `as const` arrays.

# TikTok Connect + Streamer Profile Flow
1. `POST /api/users/me/tiktok` (users.ts) — sets tiktokUsername, creates streamersTable row + kingdom
2. Without a streamer profile, ALL these routes return 404: `/api/ai/config`, `/api/ai/messages`, `/api/obs/token`, `/api/sessions/start`
3. `/api/sessions/active` returns 200 even with no streamer profile (returns null session, not 404)

# OpenAI TTS
- Added `generateVoice(text, voice)` to aiService.ts — uses `openai.audio.speech.create()` with model `tts-1`
- Added `POST /api/ai/voice` — auth required, returns audio/mpeg buffer
- Updated `useLiveSession.ts` with `TtsMode` = "off" | "browser" | "openai"
- `setTtsMode("openai")` uses fetch to `/api/ai/voice`, creates Blob URL, plays via Audio API
- `setTtsEnabled(bool)` preserved for backward compatibility (maps to browser/off)
