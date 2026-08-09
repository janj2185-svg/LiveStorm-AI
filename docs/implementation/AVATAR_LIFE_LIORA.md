# Living avatar — Liora

**Persona:** Liora · she/her · feminine presentation  
**Package:** `packages/avatar-runtime`  
**UI:** `src/design-system/avatar/LivingAvatar.tsx`  
**Gallery:** screen `avatar-life`  
**API:** `LocalAvatarLifeController` in `services/api/app/live_platforms/common/output.py`

## Goal

Give the AI assistant / co-host a **living female body** — continuous human
micro-behaviour so she never reads as a frozen still or a logo orb.

## What “alive” means here

| Signal | Behaviour |
|---|---|
| Breath | Thoracic cycle (~0.22 Hz) with light arrhythmia; drives scale + shoulder roll |
| Blink | Irregular interval, close/open phases, rare double-blink + asymmetric lid |
| Gaze | Saccades with camera-engagement bias |
| Head | Soft Lissajous micro-motion + gesture overlays |
| Gestures | nod / wave / glance / gift_react / listen / talk / think / smile |
| Speech | Text → viseme track (Latin + Ukrainian) → jaw + talk plate |

## Honest limits

Photoreal **expression plates** + life simulation produce a convincing co-host
presence in the product UI. This is **not** a full MetaHuman / neural talking-head
video pipeline. True pixel-indistinguishable realtime face swap still requires an
external avatar/video provider; the reaction contract is ready for one.

## Evidence

Expression stills: `artifacts/avatar-liora/*.jpg`  
Runtime tests: `packages/avatar-runtime/tests/life.test.ts`  
API tests: `services/api/tests/test_avatar_life.py`
