# Celestial Phoenix — Production Report (SYLORA)

**Slug:** `celestial-phoenix`  
**Name:** Celestial Phoenix  
**Price:** 1,000,000 coins  
**Rarity:** Divine (`ultra_premium`)  
**Tagline:** Where light is reborn.  
**Duration:** 15.0s  
**Branch:** `cursor/sylora-gift-library-5b96`  
**Path:** `artifacts/gift-library/celestial-phoenix/`  
**Evidence:** `/opt/cursor/artifacts/celestial-phoenix/`

---

## Honest quality gate (read first)

| Claim | Result |
|---|---|
| Asset pipeline complete (blend / GLB / 2K maps / audio / MP4 / GIF / poster / manifest) | **YES** |
| Readable avian silhouette (not a cube/sphere gift) | **YES (mid-poly procedural)** |
| Pixar cinematic parity | **NO** |
| Blizzard trailer parity | **NO** |
| Unreal Engine CGI (Unreal was not used) | **NO — Blender 4.0 EEVEE only** |
| Production-ready for SYLORA publish (wallet / WS / device QA) | **NO** |
| Status | **`PARTIAL_PRODUCTION_CANDIDATE`** |

This is a real authored Blender scene with continuous avian loft body, layered feather cards, armature, multi-shot camera, particles, 2K procedural PBR maps, stereo score, RuntimeManifest v1.0, desktop GLB + mobile LOD.  
It is **not** Hollywood AAA final. Poster/stills still read as procedural mid-poly emissive avian forms — better than a cube gift, **far below** Pixar/Blizzard trailer bar.

---

## What was built

### Scene / model
- Continuous avian body loft (tail → chest → S-neck → skull) + hooked beak, eyes, crest plumes
- Layered wing membranes + primary/covert feather cards + long tail streamers (~132 feather meshes)
- Full armature in `.blend` (spine / neck / head / jaw / wings / tail) for DCC
- Runtime hierarchy: `PhoenixFlightRoot` + wing/tail empties with object animation (glTF-safe; skins off)
- Cosmic portal (dual rings + membrane) with tear/scale animation
- Ritual temple (platform, sigil, ornate pillars) — pillars scale in mid-show; **hidden in hero stills**
- Divine halo + energy-wave rings late-scene
- Ember mesh instances + particle systems (solar feathers / star burst / embers / magic sparks)
- Procedural cosmic world + key/fill/rim/spot/sun lighting
- 10-shot cinematic camera (crane / orbit / dolly / zoom / handheld micro-shake)

### Textures
- Authored PNG maps at **2048²**: body albedo / roughness / emission / normal; wing albedo / emission  
- Path: `artifacts/gift-library/celestial-phoenix/textures/`

### Audio
- Original stereo cinematic bed (`sound/main.wav` + spatial bed): drone, portal tear, wing whoosh, choir pad, phoenix cry, finale burst

### Reactions (contract hooks in metadata / manifest)
- **AI:** “The Celestial Phoenix has blessed the stream! Unstoppable energy!”
- **Avatar:** luminous wing silhouette + solar glow
- **Streamer:** power-up / shake / lighting boost
- **Viewer:** cosmic rain overlay
- **Combo:** `sylora.gift.celestial-phoenix` window 180s  

These are **hooks**, not live E2E demos in this environment.

---

## Asset list & sizes

| File | Bytes |
|---|---|
| `scene.blend` | 4,425,496 |
| `model.glb` (desktop) | 3,536,564 |
| `model_mobile_lod.glb` | 1,703,464 |
| `preview.mp4` | ~2.0 MB (15.0s) |
| `preview.gif` | ~2.0 MB (15.0s) |
| `poster.png` | ~1.1 MB (hero re-render) |
| `thumbnail.png` | ~289 KB |
| `sound/main.wav` | 2,646,044 |
| `sound/spatial_bed.wav` | 2,646,044 |
| `runtime-manifest.json` | 4,290 |
| `metadata.json` | 1,245 |
| `textures/*.png` | 6 × 2K maps |
| `stills/shot_01..05.png` | hero orbits |

Download budget (GLB+audio): within 50 MB quality budget. Peak Blender sync ~100 MB during beauty re-render (not runtime device memory).

---

## Verification checklist

| Check | Result |
|---|---|
| Blender file exists & reopens | ✔ 211 objs, 1 armature, 31 actions |
| GLB opens / has animations | ✔ |
| Mobile LOD GLB | ✔ |
| Audio non-empty stereo 15s | ✔ |
| MP4 / GIF / poster / thumbnail | ✔ ffprobe OK |
| Manifest schema 1.0 | ✔ |
| 2K texture maps present | ✔ |
| Cameras cinematic (multi-shot) | ✔ in blend + preview sequence |
| FPS desktop/mobile | ✖ NOT MEASURED |
| Memory < 120 MB runtime | ✖ NOT MEASURED |
| Runtime Three.js + verified delivery | ✖ NOT RUN |
| Wallet send / receive | ✖ NOT RUN |

Automated report: `artifacts/gift-library/celestial-phoenix/report.json`

---

## Optimization report

| Preset | Approach |
|---|---|
| Desktop Ultra | Full feather set + temple + portal + embers in `model.glb` (~3.5 MB) |
| Mobile LOD | Decimated body + every-4th feather in `model_mobile_lod.glb` (~1.7 MB) |
| Render | EEVEE 800², 36 preview frames across 360-frame / 24 fps timeline; hero stills locked pose |
| Audio | Synthesized original stereo (no third-party samples) |
| Textures | Procedural numpy → PNG 2048² |

---

## Remaining issues (must fix before READY)

1. Visual grade is **procedural mid-poly** — not high-poly sculpt + production retopo + groomed feathers  
2. No Mantaflow fire / smoke / water bake (particle + emissive stand-ins)  
3. Facial animation = jaw/crest keys in `.blend` only (not skinned blendshapes in GLB)  
4. Temple pillars remain primitive architecture (acceptable as env; must stay out of hero marketing frames)  
5. Device FPS / RAM / load-time not measured  
6. SYLORA wallet publish + WebSocket delivery + live AI/avatar hooks not E2E’d (no Docker API in this agent)  
7. **Do not claim Pixar / Blizzard / Unreal parity**

---

## Reproduce

```bash
python3 scripts/gift-library/produce_celestial_phoenix.py
```

Builders:
- `scripts/gift-library/build_celestial_phoenix.py`
- `scripts/gift-library/produce_celestial_phoenix.py`
