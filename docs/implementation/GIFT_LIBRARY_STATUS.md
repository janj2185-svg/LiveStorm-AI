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
| READY (full production checklist incl. authored art + device FPS) | **0** |
| SANDBOX_STAGING_READY (API-published Lumen starter pack) | **10** |
| ASSETS_BUILT_NOT_READY (unique Blender/animation/audio/preview/manifest evidence, not seeded) | **0** |
| SPEC_ONLY | **90** |

A gift is **READY** only when real 3D, animation, VFX, sound, runtime preview,
SYLORA integration, video proof, and performance checks all pass.

For sandbox/staging, **SANDBOX_STAGING_READY** means the backend catalog row is
`published`, the runtime version passes the strict manifest / verified asset /
fallback / budget gate, and `/v1/gifts/catalog` can list it. These are honest
procedural Lumen starter gifts; they are not claimed as AAA TikTok-level art.

## What was delivered in this environment

1. **100 unique specifications** under `artifacts/gift-library/<slug>/spec.json`
   with distinct form families (no color-clone variants).
2. **Asset pipeline** (`scripts/gift-library/`) using Blender 4.0.2 + FFmpeg +
   original synthesized stereo WAVs.
3. **Built-candidate metadata** with per-slug folders containing
   `runtime-manifest.json`, `metadata.json`, `spec.json`, and particle-pack
   configuration. Binary GLB/audio/poster files may be absent in this checkout;
   the sandbox/staging seed uses procedural starter config assets when they are
   missing.
4. **Gift Store gallery** screen `gift-library-store` in the SYLORA Lumen
   design system (not LiveStorm).
5. **Honest test-send**: production send claims stay blocked unless the gift is
   truly full-production READY; sandbox/staging starter gifts are labeled
   separately.

## Sandbox/staging READY seed

The API now includes an idempotent seed path for 10 Lumen starter gifts:

```bash
cd services/api
sylora-api seed-ready-gifts
# or
python scripts/seed_ready_gifts.py
```

Optional boot-time staging/sandbox seed:

```bash
BOOTSTRAP_READY_GIFTS=true sylora-api ...
```

Seeded slugs: `lumen-seed`, `paper-koi`, `signal-ribbon`, `tea-steam-heart`,
`constellation-pin`, `stage-curtain-rise`, `opera-mask-reveal`,
`worldfold-letter`, `sylora-genesis-spire`, `celestial-phoenix`.

The seed reads concept metadata from `artifacts/gift-library` and promotes local
built GLB/audio/poster assets when present. If those binaries are missing in a
deployment checkout, it falls back to strict procedural starter manifests with
verified runtime / particle / shader config asset rows. Each seeded manifest
targets `threejs` and `flutter` and is grouped in collection
`lumen-starter-pack`.

## What is NOT complete

- Hollywood / hand-sculpted AAA art pass for 100 gifts
- Full-production READY promotion for the Lumen starter pack
- Device-measured FPS / memory / load-time for every gift
- Live wallet purchase + send + second-user WebSocket receive (Docker not
  available in this agent VM)
- Flutter on-device demo (Flutter SDK not installed here)
- Batch video of all 100 sequential plays
- Marking any gift full-production `READY` / `100/100`

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

# Seed backend catalog for sandbox/staging
cd services/api && sylora-api seed-ready-gifts

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
