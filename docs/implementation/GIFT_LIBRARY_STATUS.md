# SYLORA Official Gift Library — Status (honest)

**Verified identity**

| Item | Value |
|---|---|
| Repo path | `/workspace` |
| GitHub remote | `github.com/janj2185-svg/LiveStorm-AI` (legacy name) |
| Active product tree | **SYLORA** |
| Active branch | `cursor/sylora-gift-library-5b96` |
| Base branch | `cursor/sylora-design-system-18ae` |
| Not used | `main` / LiveStorm monolith / `cursor/sylora-production-release-5b96` LiveStorm assets |

## Main folders

```text
apps/sylora/              Flutter client
apps/gift-studio/         Gift authoring
packages/gift-runtime/    RuntimeManifest runtime
services/api/             FastAPI gifts/wallet/WS
artifacts/gift-library/   Official Gift Library artifacts
src/screens/commerce/     Gift Library Store gallery screen
```

## Counts (do not inflate)

| Bucket | Count |
|---|---|
| Total gift concepts / specs | **100** |
| READY (full checklist incl. runtime + SYLORA integration + device FPS) | **0** |
| ASSETS_BUILT_NOT_READY (unique Blender/GLB/animation/audio/preview/manifest) | **9** |
| SPEC_ONLY | **91** |

A gift is **READY** only when real 3D, animation, VFX, sound, runtime preview,
SYLORA integration, video proof, and performance checks all pass.

## What was delivered in this environment

1. **100 unique specifications** under `artifacts/gift-library/<slug>/spec.json`
   with distinct form families (no color-clone variants).
2. **Asset pipeline** (`scripts/gift-library/`) using Blender 4.0.2 + FFmpeg +
   original synthesized stereo WAVs.
3. **Built candidates** with per-slug folders containing `scene.blend`,
   `model.glb` (with animations), `poster.png`, `preview.mp4`, `preview.gif`,
   `sound/`, `particles/`, `runtime-manifest.json`, `metadata.json`, `report.json`.
4. **Gift Store gallery** screen `gift-library-store` in the SYLORA Lumen
   design system (not LiveStorm).
5. **Honest test-send**: blocked unless status is READY; no fake success.

## What is NOT complete

- Hollywood / hand-sculpted AAA art pass for 100 gifts
- Device-measured FPS / memory / load-time for every gift
- Live wallet purchase + send + second-user WebSocket receive (Docker not
  available in this agent VM)
- Flutter on-device demo (Flutter SDK not installed here)
- Batch video of all 100 sequential plays
- Marking any gift `READY` / `100/100`

## External needs (no hiring/spend without approval)

- Character/environment art direction + DCC artists for Divine/Mythic scenes
- Studio sound design beyond synthesized beds
- Running Compose stack (Postgres/Redis/MinIO/API) for publish + E2E delivery
- Device lab for mobile LOD / desktop ultra FPS capture

## Local replay commands

```bash
# List names
sed -n '1,200p' artifacts/gift-library/NAMES.md

# Play one preview
ffplay artifacts/gift-library/lumen-seed/preview.mp4

# Validate manifests for built gifts
python3 scripts/gift-library/validate_manifests.py

# Build another gift
python3 scripts/gift-library/build_ready_gift.py --slugs tea-steam-heart

# Design gallery store
pnpm install && pnpm dev
# open #/gift-library-store
```

## LiveStorm cleanup

Product source on this branch has no LiveStorm app package. Remaining mention of
`LiveStorm-AI` is the **GitHub remote name only**, documented in
`docs/implementation/ACTIVE_PROJECT_IDENTITY.md`.
