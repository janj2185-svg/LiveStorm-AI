# SYLORA Gift Library — API seed / publish path

Publish gifts only through Gift Studio + `/v1/gifts/author/*` and
`/v1/gifts/review/*/publish`. Do not insert fake catalog rows.

## Prerequisites

```bash
cp infrastructure/.env.example infrastructure/.env
# fill required secrets
docker compose --env-file infrastructure/.env \
  -f infrastructure/compose/compose.yml up --build
```

## Per-gift publish checklist

1. Create category `official-gift-library`.
2. Create definition with slug, name, `price_minor`, `api_tier`.
3. Create version; upload `model.glb`, `poster.png`, `sound/main.wav`, `.blend` as source.
4. PATCH runtime manifest from `runtime-manifest.json` (replace asset UUIDs with verified upload IDs).
5. Submit → validate → publish.
6. Confirm `GET /v1/gifts/catalog` and `GET /v1/gifts/catalog/{slug}/runtime`.
7. Test send via `POST /v1/gifts/sends` and receive on `/v1/ws/gifts`.

## Current built candidates (9)

- `lumen-seed` — Lumen Seed — Rare — 10 — **ASSETS_BUILT_NOT_READY**
- `paper-koi` — Paper Koi — Rare — 25 — **ASSETS_BUILT_NOT_READY**
- `signal-ribbon` — Signal Ribbon — Rare — 25 — **ASSETS_BUILT_NOT_READY**
- `tea-steam-heart` — Tea Steam Heart — Rare — 50 — **ASSETS_BUILT_NOT_READY**
- `constellation-pin` — Constellation Pin — Rare — 50 — **ASSETS_BUILT_NOT_READY**
- `stage-curtain-rise` — Stage Curtain Rise — Epic — 500 — **ASSETS_BUILT_NOT_READY**
- `opera-mask-reveal` — Opera Mask Reveal — Legendary — 5000 — **ASSETS_BUILT_NOT_READY**
- `worldfold-letter` — Worldfold Letter — Mythic — 50000 — **ASSETS_BUILT_NOT_READY**
- `sylora-genesis-spire` — SYLORA Genesis Spire — Divine — 1000000 — **ASSETS_BUILT_NOT_READY**

## Not READY

No gift is marked READY until runtime preview, wallet send, WebSocket
delivery to a second user, and device performance samples succeed.
