# AAA Gift Production Pipeline (requires owner approval)

Status: **NOT bundled**. Gift Gallery, Store, Wallet ledger, purchase/send APIs,
Gift Studio authoring, and the Three.js/Lottie runtime are implemented. No
licensed AAA CGI gift library ships in this repository.

Do not claim AAA animations, particles, lighting, physics, shaders, sound, or
3D assets are production-complete until authored assets pass the gates below.

## What already works in code

- Immutable credit wallet and purchase/send/refund ledger flows
- Versioned gift definitions, categories, collections, inventory, delivery events
- Strict manifest validation and runtime packaging contracts
- Gift Studio draft → verified assets → manifest → review → publish workflow
- Procedural/Lottie/Three.js runtime with particles, timelines, lights, audio hooks
- Explicit object-storage failure when S3/MinIO credentials are absent

## What does not exist yet

- Licensed character/gift models, textures, rigs, authored animation clips
- Production particle caches, shader packs, spatial audio stems, VFX lighting looks
- Device performance budgets signed off on representative phones/desktops
- Rights/provenance manifests and studio contracts
- Storefront content for friends to purchase beyond empty catalog

## Recommended production pipeline (approval required)

1. **Art direction pack** — rarity ladder, silhouette language, duration budgets,
   accessibility/reduced-motion variants, audio loudness targets.
2. **Blender authoring** — one master humanoid/socket spec; gift props with LODs;
   export GLB + source `.blend` retained for provenance.
3. **Optional Unreal/Houdini** — only for hero gifts that need simulation caches;
   bake to GLB/Lottie/WebM fallbacks for Flutter/Web.
4. **Technical art pass** — skeleton naming, blendshapes, material limits,
   texture compression, max download bytes per quality tier.
5. **Gift Studio import** — upload via real presigned S3 grants; SHA-256 verify;
   attach strict manifest; run automated validator.
6. **Human review** — creator/admin publish gate; emergency retire path.
7. **Device QA matrix** — mid-range Android, current iPhone, Chrome/desktop,
   OBS overlay path; frame-time and thermal budgets recorded.
8. **Legal clearance** — asset license, music stems, likeness rights, region
   restrictions, age policy.

## Owner decision checklist

Approve or reject each item before commissioning paid studio work:

- [ ] Approve Blender-first pipeline vs Unreal/Houdini for hero gifts
- [ ] Approve rarity count and price ladder in `SYLORA_CREDIT` minor units
- [ ] Approve external animation studio shortlist / in-house team
- [ ] Approve S3/MinIO production bucket and CDN budget
- [ ] Approve device QA lab or vendor for performance sign-off
- [ ] Approve rights counsel review for UGC creator submissions

Until these are approved and assets are imported through Gift Studio, the gift
catalog correctly remains empty and purchase flows have nothing to sell.
