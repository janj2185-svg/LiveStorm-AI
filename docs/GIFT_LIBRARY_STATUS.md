# SYLORA Gift Library — Status Report

**Date:** 2026-08-01  
**Policy:** 100% original Sylora IP. No TikTok gift copies.

## Pipeline totals (automated validation)

| Asset | Count |
|---|---|
| Unique gifts | **100 / 100** |
| Unique names / slugs | **100 / 100** |
| Blender `.blend` | **100 / 100** |
| GLB | **100 / 100** |
| Thumbnails + posters | **100 / 100** |
| Preview MP4 | **100 / 100** |
| Preview GIF | **100 / 100** |
| Runtime manifests | **100 / 100** |
| Particle packs | **100 / 100** |
| Sound pack stubs | **100 / 100** |

Validation: `artifacts/gift-library/reports/pipeline-validation.json` → `"ok": true`

## Rarity split

| Rarity | Count | Price band (coins) |
|---|---|---|
| Rare | 20 | 10 – 500 |
| Epic | 20 | 500 – 25,000 |
| Legendary | 20 | 10,000 – 500,000 |
| Mythic | 20 | 250,000 – 2,500,000 |
| Divine | 20 | 1,000,000 – 10,000,000 |

## What “AAA” means in this delivery (honest)

| Layer | Status |
|---|---|
| Original concepts + stories + scene beats | ✅ Complete |
| Blender projects (procedural unique meshes, PBR, rig, animation) | ✅ 100 generated |
| GLB export with animation | ✅ 100 |
| Runtime manifests + combo/AI/avatar hooks | ✅ |
| Three.js cinematic player (camera, particles, audio synth, LOD) | ✅ |
| Gallery Gift Store UI | ✅ `/gifts` |
| Preview MP4/GIF | ✅ Ken Burns from EEVEE thumbnails (fast pipeline) |
| Hand-sculpted Pixar/Blizzard hero meshes | ❌ Not claimed — procedural v1 |
| Studio spatial SFX / dynamic music scores | ⚠️ Synth stubs; replace with studio packs |
| Full EEVEE multi-second volumetric VFX per gift | ⚠️ Thumbnail-quality EEVEE; hero re-render optional |
| WebGPU path | ⚠️ Flagged for mythic/divine; WebGL primary |

## How to regenerate

```bash
python3 artifacts/gift-library/scripts/generate_catalog.py
blender --background --python artifacts/gift-library/scripts/generate_blender_assets.py -- --limit 100 --skip-video --samples 8
python3 artifacts/gift-library/scripts/generate_previews_ffmpeg.py
python3 artifacts/gift-library/scripts/validate_pipeline.py
```

Hero EEVEE video (slow): omit `--skip-video` for selected IDs.

## Runtime interactions

- `sylora:gift:play` socket event
- `ai:gift-hook` with per-gift prompt hints
- Avatar animation keys in manifests
- Combo tags + Divine global events
- Mobile vs Desktop particle LOD in player

## What to improve next (world-class path)

1. Art-directed sculpt pass on Divine 20 by a Blender/Unreal team  
2. Houdini particle caches → simplified GPU particles  
3. Licensed/original orchestral beds + Foley spatial packs  
4. True WebGPU renderer path for Divine  
5. Wallet + purchase flow wired to Stripe  
6. OBS overlay dedicated gift stage  
7. Per-gift regression screenshots in CI  

## Catalog index

See `artifacts/gift-library/catalog/sylora-gifts-100.json` for the full 100.
