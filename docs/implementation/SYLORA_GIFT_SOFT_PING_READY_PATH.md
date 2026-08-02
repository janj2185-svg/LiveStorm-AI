# SYLORA gifts — official catalog + soft-ping READY path

## Official catalog decision

**Product catalog for new SYLORA gifts:** `artifacts/sylora-gift-100-originals/`  
(anti-TikTok-cliché templates + concept art + seed).

**Parallel fantasy set** `artifacts/gift-library/` remains a prior experiment.  
Do not bulk-publish both into the same live category without an explicit migration plan.

## soft-ping status (this branch)

| Layer | Status |
|---|---|
| Template + concept poster | Done |
| Procedural GLB + WAV + poster + preview | `ASSETS_BUILT_NOT_READY` |
| API harness E2E (author → publish → catalog → send) | **Passed** (`tests/test_soft_ping_e2e.py`) |
| Product **READY** | **No** |

### What the harness proved

- `POST /v1/gifts/author/categories` (`official-gift-library`)
- Definition from seed `definition_payload` (slug `soft-ping`, price 10, tier `rare`)
- Version + RuntimeManifest validate/publish
- Catalog list + `/v1/gifts/catalog/soft-ping/runtime`
- Wallet issuance + `POST /v1/gifts/sends`
- Gift events ticket issuance

### What is still blocked for product READY

1. **Docker Compose / live API** — not available in this agent environment (`docker` missing)
2. **Real S3 upload + checksum verify** — harness injects verified `GiftAsset` rows; live uploads return `object_storage_unavailable` without MinIO
3. **Blender art pass + `.blend`** — current GLB is procedural (`write_minimal_glb.py`); RuntimeManifest `source_metadata` requires `application: "blender"`
4. **Second-client WebSocket delivery proof** — ticket issued; live dual-client WS not run here
5. **Device FPS / memory samples**

## Owner commands (when Compose is up)

```bash
# 1) stack
cp infrastructure/.env.example infrastructure/.env
# fill secrets, then:
docker compose --env-file infrastructure/.env \
  -f infrastructure/compose/compose.yml up --build

# 2) draft definition (priority)
export SYLORA_API_BASE=http://127.0.0.1:8000
export SYLORA_AUTHOR_TOKEN=…
export SYLORA_GIFT_CATEGORY_ID=…  # official-gift-library
python3 scripts/gift-library/draft_sylora_100_definitions.py --slugs soft-ping --execute

# 3) Gift Studio / author APIs: upload model.glb, main.wav, poster.png
# 4) PATCH runtime-manifest with verified asset UUIDs (no fake blender metadata until .blend exists)
# 5) submit → validate → admin publish
# 6) send + WS proof on two clients → then mark READY in local catalog
```

## Regression

```bash
cd services/api
python3 -m pytest tests/test_soft_ping_e2e.py -q
```

Report written to: `artifacts/sylora-gift-100-originals/soft-ping/e2e-harness-report.json`
