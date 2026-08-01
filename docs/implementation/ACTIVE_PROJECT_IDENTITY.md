# ACTIVE PROJECT IDENTITY — SYLORA

**Verified:** 2026-08-01

## 1. Active repository

| Field | Value |
|---|---|
| Path | `/workspace` |
| GitHub remote | `github.com/janj2185-svg/LiveStorm-AI` |
| Product / codebase in use | **SYLORA** (branch below) |
| Cloud environment name | `janj2185-svg/LiveStorm-AI` |

> Note: the GitHub *repository name* is still `LiveStorm-AI` (legacy remote).  
> The **active product tree** on this branch is SYLORA (`apps/sylora`, FastAPI, gift-runtime).  
> There is **no separate GitHub repo named SYLORA** under this account — only this remote.

## 2. Active branch

```text
cursor/sylora-gift-library-5b96
```

Created from:

```text
origin/cursor/sylora-design-system-18ae
```

**Not** from `main` (LiveStorm Replit monolith).

## 3. Why previous screenshots looked like LiveStorm

Previous agent work on `cursor/sylora-production-release-5b96` was based on **`main`** = LiveStorm AI (`artifacts/livestorm-ai`).  
That was the wrong tree for this gift task. Those assets/screenshots must **not** be treated as SYLORA Gift Library completion.

## 4. Main SYLORA folders (this branch)

```text
/workspace/
  README.md                 # SYLORA ecosystem
  apps/sylora/              # Flutter client (Android/iOS/Web/Desktop)
  apps/gift-studio/         # Gift authoring + Three.js preview (real API)
  packages/gift-runtime/    # RuntimeManifest v1.0 renderer
  services/api/             # FastAPI + gifts/wallet/ledger/WS
  services/companion/       # OBS companion
  infrastructure/           # Compose, K8s, media plane, observability
  src/                      # Lumen design system gallery
  design/                   # tokens
  docs/design/              # design docs
  docs/implementation/      # implementation / readiness docs
```

## 5. LiveStorm cleanup on this branch

| Item | Action |
|---|---|
| Untracked `lib/`, `artifacts/` from LiveStorm checkout | Removed from working tree |
| Product source on this branch | No LiveStorm app package; README is SYLORA |
| Remote repo name `LiveStorm-AI` | Legacy GitHub name only — product is SYLORA |

## 6. Gift system already in SYLORA (contracts)

- `packages/gift-runtime` — strict RuntimeManifest, GLB/audio/particles/shaders, combo, WS tickets
- `apps/gift-studio` — authoring UI against `/v1/gifts/author/*` (no fake catalog)
- `services/api` — catalog, purchase, send, delivery, refunds, WS `/v1/ws/gifts`

AAA content is **not** bundled; Studio README states authored DCC assets are required.

## 7. Gift Library readiness policy (this task)

A gift is **READY** only when Blender + GLB + animation + VFX + audio + runtime preview + SYLORA integration + performance evidence exist and are tested.

Metadata / Ken-Burns / color variants alone = **SPEC ONLY**, never READY.
