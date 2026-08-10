# CURRENT_STATE — Project-Sylora-2

**Repo:** `janj2185-svg/Sylora`  
**Date:** 2026-08-10  
**Branch:** `cursor/sylora2-ai-native-ecosystem-18eb`

## Stack

| Layer | Technology |
|---|---|
| Web | Next.js 16, React 19, Auth.js (Google/GitHub), Postgres adapter |
| API | FastAPI modular monolith |
| Data | PostgreSQL 16 (+ SQLite for API unit tests), Redis (present, unused by new core) |
| Edge | nginx + TLS scaffolding |

## What existed before this rebuild

- Dark green/gold landing (`getsylora.com` branding)
- Auth.js login + protected `/app` placeholder (“далі з’явиться інтерфейс”)
- FastAPI `/health` only
- Docker Compose (api, frontend, nginx, db, redis)
- No Personal AI, Identity graph, marketplace, or developer platform

## What exists now (foundations)

- **Living Sylora avatar** (assembled plates, no shattered crossfade) on landing + Command Center
- **Personal AI** API: dashboard, chat, memory tiers, export/delete, activity log, permissions
- **Identity** API with privacy levels
- **Permission-aware Knowledge Graph** nodes/edges
- **Action Engine** with confirmation levels
- **Agent Marketplace** seed catalog + install
- **Developer apps** registration with hashed API keys (raw key once)
- **Command Center UI** — single Personal AI surface + Identity / Memory / Knowledge / Agents / Developer / Permissions
- BFF proxy `/api/sylora/*` (session → internal secret headers)

## Honest status labels

See `FINAL_IMPLEMENTATION_REPORT.md` for DONE / PARTIAL / BLOCKED / NOT_STARTED.
