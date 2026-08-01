# AAA Animated Gift System — Implementation Plan (REQUIRES YOUR APPROVAL)

## Current reality (verified)

This codebase **does not** contain:

- Gift Gallery / Gift Store pages  
- Wallet / coin purchase flow  
- First-party gift inventory  
- 3D gift GLB/GLTF packs, particle systems, lighting rigs, physics, or custom shaders for gifts  

What **does** exist:

- TikTok LIVE gift **events** (real + demo simulator)  
- AI announcements / avatar `gift_reaction` animations  
- Gamification mapping (gifts → XP / kingdom gold / boss damage)  
- Concept art PNGs (`gifts.png`, `attached_assets/LiveStorm_Gifts_Concept_*.png`)  

**We will not pretend AAA gift assets already exist.**

---

## Proposed product scope (for approval)

### Phase A — Platform plumbing (engineering)

1. `gifts` catalog table (id, slug, rarity, coinPrice, animationKey, soundKey, previewUrl)  
2. `wallets` + `wallet_ledger` (balance, purchases, spends)  
3. Stripe (or TikTok diamonds passthrough) top-up  
4. Gift send API → Socket.IO `gift:play` to stream room + OBS overlay  
5. Web gift player (lightweight): Lottie / Spine / simple Three.js for Mid-tier  

**Deliverable:** purchasable catalog with 2D/Lottie animations — not Unreal cinematic quality.

### Phase B — Mid-quality animation pack (in-house or freelance)

- 20–40 gifts across categories (Cute, Luxury, Hype, Seasonal)  
- Formats: Lottie JSON + WebM alpha + optional GLB  
- Sounds: short SFX (licensed)  
- Performance budget: ≤ 16ms frame impact on mid-range laptops  

### Phase C — AAA cinematic gifts (professional pipeline)

Only after you approve budget + vendor:

| Pipeline | Best for | Notes |
|---|---|---|
| **Blender** | GLB/glTF gifts, lighting, bake | Primary web export path |
| **Houdini** | Particles, destruction, fluid | Cache → simplified GPU particles in Three.js/Babylon |
| **Unreal Engine** | Cinematic hero gifts | Pixel-stream or pre-rendered WebM/EXR sequences — heavy |
| **External studio** | Full art direction | Contract + milestone reviews |

Recommended hybrid:

1. Studio delivers Blender source + baked GLB + 4K WebM alpha heroes  
2. Engineering integrates via `GiftRuntime` (Three.js) + OBS browser source  
3. LOD: Low (Lottie) / Mid (GLB) / High (WebM cinematic) auto-selected by device  

---

## Cost / decision points (fill in)

| Decision | Options | Your choice |
|---|---|---|
| Build Gift Store at all? | Yes / No / Later | ________ |
| Monetization | Stripe coins / TikTok-only passthrough / Both | ________ |
| Art quality target | Lottie-only / Mid GLB / AAA cinematic | ________ |
| Vendor | In-house / Freelancer / Studio name | ________ |
| Budget ceiling | $____ | ________ |
| First shippable set | N gifts | ________ |

---

## What we will implement only after approval

- DB schema + APIs for catalog/wallet  
- Gift Store UI  
- Overlay gift player  
- Asset pipeline CI (validate GLB size, Draco, audio loudness)  
- Legal review (payment, gambling-adjacent framing, TikTok gift rules)  

Until you approve, the production stance is:

> **Gifts = TikTok (or demo) live events powering AI + gamification — not a SYLORA gift marketplace.**

Reply with: `APPROVE gifts plan` + choices table, or `REJECT / DEFER gifts AAA`.
