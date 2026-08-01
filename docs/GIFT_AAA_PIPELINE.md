# AAA Animated Gift Pipeline — Approval Required

**Status:** NOT IMPLEMENTED in this repository  
**Honesty rule:** Do not treat CSS emoji previews or TikTok gift ingest as AAA gift commerce.

## What works today

| Capability | Status |
|---|---|
| TikTok gift event ingest | Working |
| YouTube Super Chat → gift event | Working (needs Google OAuth) |
| OBS gift alert overlay (CSS + emoji) | Working |
| Avatar procedural `gift_reaction` | Working |
| Gift coins → XP / boss damage / kingdom gold | Working |
| `/gifts` received feed + reference catalog | Working (preview only) |
| Purchasable gift store / wallet | **Missing** |
| AAA 3D / particles / shaders / sound packs | **Missing** |

## Why AAA cannot ship from this repo alone

There are **zero** gift `.glb` / `.gltf` models, **zero** gift shader files, **zero** gift audio packs, and **no** wallet/purchase ledger tables. Generating production-quality animated gifts automatically is not reliable enough for a paid product.

## Proposed pipeline (needs your approval)

### Phase A — Product & ledger (engineering)

1. Schema: `gift_definitions`, `gift_categories`, `wallets`, `wallet_ledger`, `gift_purchases`, `gift_deliveries`
2. APIs: catalog CRUD (admin), balance, purchase (idempotent), delivery socket event `gift:play`
3. Payment: Stripe (or equivalent) top-up → wallet credits — **paid Stripe account required**
4. Legal: virtual goods terms, refunds, age gating — **your legal approval**

### Phase B — Art production (studio / tools)

Pick one primary pipeline (recommend Blender → glTF for web overlays):

| Tool | Role | Deliverable |
|---|---|---|
| **Blender** | Model + animate gifts | `.glb` ≤ 2–5 MB, 2–6 s loops |
| **Unreal Engine** | Cinematic / particle hero gifts | Export sequence / Niagara → baked video or glTF |
| **Houdini** | High-end particles / destruction | Cached sims → Alembic/glTF or WebM |
| **External studio** | Full pack of 20–50 gifts | Spec sheet + QC renders |

Also produce:

- WebM/Lottie fallback for low-end devices
- Stereo SFX (ogg/mp3) per gift
- Thumbnail PNG 256²

### Phase C — Runtime player (engineering)

1. OBS/browser overlay route `/obs/gift-player` with priority queue
2. Interrupt rules (whale gifts preempt micro)
3. Performance budgets: 60 fps desktop, degrade to Lottie/WebM on weak GPUs
4. Sync: server timestamps + client catch-up if late join

### Phase D — QA matrix

- Coin tiers micro → legendary
- Combo spam / `repeatEnd` correctness (already fixed in ingest)
- Mobile Safari / OBS CEF / Electron desktop
- Missing asset → emoji fallback (never silent fail)

## Cost / credentials you must supply

- [ ] Approve budget for art (Blender freelancer / studio / Unreal artist)
- [ ] Stripe (or payment) account for wallet top-ups
- [ ] CDN for gift assets (Cloudflare R2 / S3)
- [ ] Legal review for selling virtual gifts

## Decision needed from you

Reply with one of:

1. **Approve Phase A only** (wallet + purchase, emoji/CSS delivery)
2. **Approve A + Blender webGLB pack** (recommended for SYLORA web/OBS)
3. **Approve full Unreal/Houdini cinematic pack** (highest cost)
4. **Defer AAA gifts** — keep TikTok ingest + CSS gallery as-is

Until you approve, the UI correctly labels AAA store as **pending approval**.
