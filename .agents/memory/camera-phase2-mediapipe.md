---
name: Camera Phase 2 MediaPipe wiring
description: How MediaPipe Face Landmarker is wired into avatar expressions; key gotchas.
---

## Pattern
- `useFaceTracking(videoRef, enabled)` → FaceTrackingData → avatar-studio state
- `faceExpressionMapper.ts` — pure blendshape→expression mapping (thresholds tunable)
- CameraPreview owns videoRef + runs useFaceTracking internally; calls `onTrackingData` callback
- AvatarCanvas/AvatarStage accept `externalBlink?` prop to override timer-based blink

## WASM CDN
`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm`
Model: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`

**Why:** Local WASM copy would require Vite config changes; CDN approach works without extra config.

## Blink conflict
AvatarCanvas had timer-based blink every 3.8s. Added `externalBlink` prop — when non-null, overrides timer in both VRMAvatarView and RPMAvatarView useFrame loops.

## TTS priority
Avatar-studio doesn't have TTS — face tracking freely drives mouthOpen. In live-studio (if added), when `isSpeaking=true`, useLipSync should win over face tracking for mouthOpen.

## Smoothing
LERP=0.30 per frame at 15fps. Values in `smoothRef` accumulate across frames. Reset on tracking stop.

## Performance
15fps cap via `FRAME_MS = 1000/15`. GPU delegate first, CPU fallback on failure.
