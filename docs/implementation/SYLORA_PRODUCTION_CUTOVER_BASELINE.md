# SYLORA production cutover baseline

**Restore source:** `janj2185-svg/LiveStorm-AI` @ `bd28afab623c771bad7f80e72babd81714b10caa`  
**Controlled branch:** `restore/sylora-production-bd28afa`  
**Target domain:** `getsylora.com` (Cloudflare orange-cloud preserved)

## Gift honesty (do not change)

| Status | Count |
|---|---:|
| READY | 0 |
| ASSETS_BUILT_NOT_READY | 8 |
| SPEC_ONLY | 92 |

## Old production (preserved)

| Field | Value |
|---|---|
| Repo | `janj2185-svg/Sylora` |
| Branch | `cursor/sylora-dashboard-foundation-fc9f` |
| Commit | `55c5d1305c14d62fc085d60ff0cf5b20fb8d0e92` |
| Directory | `/root/Sylora` |
| Compose project | `sylora` |
| Rollback backup | `/root/sylora-backups/pre-cutover-20260803T062242Z` |

## New production (parallel then cutover)

| Field | Value |
|---|---|
| Directory | `/root/Sylora-restored` |
| Compose project | `sylora-restored` |
| Parallel compose | `infrastructure/production/docker-compose.parallel.yml` |
| Direct API check | `http://127.0.0.1:18000/health/ready` |
| Direct web check | `http://127.0.0.1:18080/` |

## Schema decision

Dashboard Postgres (`accounts`, `agents`, `agent_runs`, …) is **not** schema-compatible with SYLORA FastAPI (`wallet_gifts`, `ai_brain`, …).  
**Do not import** dashboard data automatically. Keep both databases isolated.

## Backlog after cutover

1. Production defects / ops hardening  
2. AI Brain improvements  
3. Flutter/web UX  
4. Gift Studio packaging on edge  
5. Gift publishing pipeline (Blender art → READY)  
6. S3/R2 media infrastructure  
7. WebSocket/live delivery proof  
8. Unfinished READY criteria (still 0)

## Do not merge

Never merge `janj2185-svg/Sylora` dashboard into this baseline.
