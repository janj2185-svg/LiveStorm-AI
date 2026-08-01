# AAA gift production pipeline (requires owner approval)

## Current reality

SYLORA ships:

- Strict runtime manifests (`packages/gift-runtime`)
- Three.js + Lottie + Web Audio renderer with particles, lights, shaders,
  timelines, combinations, and capability negotiation
- Gift Studio authoring → S3 verify → review → publish
- Immutable wallet purchase/send/refund ledger
- One **demo** gift (`demo-heart`): PNG sprite + Lottie fallback

SYLORA does **not** ship a licensed AAA CGI gift library. Claiming otherwise
would be false.

## Why automatic AAA generation is not credible

Photoreal/high-end gifts need authored models, textures, rigs, animation,
VFX, shaders, audio, LODs, compression, rights clearance, and device QA.
Generative tools can assist concept art; they do not replace production
pipelines or licenses.

## Proposed pipelines (pick one — needs your approval)

### Option A — Blender-centered (recommended first)

1. Art direction pack (silhouette, rarity tiers, duration budgets)  
2. Blender authoring (models, materials, animation ≤ 5s for common / ≤ 12s epic)  
3. Export glTF/GLB + optional Lottie fallback + AAC/OGG stems  
4. Technical art packs into SYLORA manifest v1.0 with checksums  
5. Upload via Gift Studio; CI validates budgets  
6. Device QA matrix (mid Android, recent iPhone, desktop Chrome, low-end WebView)

**Owner supplies:** artists or studio contract, license texts, brand guidelines.

### Option B — Unreal / Unity cinematic

1. Author in Unreal Niagara / Unity VFX Graph  
2. Bake to glTF sequences or render sprite sheets / Lottie for mobile  
3. Package through Gift Studio with `unity`/`unreal` renderer target labels  
4. Native Flutter/engine plugins later (not bundled today)

**Owner supplies:** engine seats, VFX talent, export conventions approval.

### Option C — External studio

1. RFP with SYLORA manifest contract + budget caps  
2. Studio delivers verified assets + provenance CSV  
3. Legal clears music/SFx/likeness  
4. SYLORA ops publish via review workflow

## Performance budgets (enforce in manifests)

| Tier | Max download | Max duration | Max particles | Audio peak |
|---|---|---|---|---|
| simple | 250 KB | 2.5 s | 200 | −6 dBFS |
| rare/epic | 1.5 MB | 5 s | 1 000 | −6 dBFS |
| legendary+ | 4 MB | 12 s | 3 000 | −3 dBFS |

Clients must honor reduced-motion / low-end / no-audio fallbacks.

## Approval gate

Reply with:

- Chosen option (A/B/C)  
- Budget ceiling and first pack size (e.g. 12 gifts)  
- License constraints  
- Whether Flutter native VFX is in scope for v1 or Gift Studio/web only  

Until approval, keep shipping tooling + demo gifts only.
