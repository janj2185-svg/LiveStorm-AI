---
name: LiveStorm AI Architecture
description: Stack, artifact layout, DB schema, API routes, and task progress for LiveStorm AI
---

## Stack
- Frontend: React/Vite at `artifacts/livestorm-ai` (port 23121, previewPath `/`)
- API: Express/Node at `artifacts/api-server` (port 8080)
- DB: PostgreSQL (DATABASE_URL env var)
- Auth: Clerk (app_3EoSQvG2NVkqRRX6iyxkqYwH6cI)
- Payments: Stripe (Task 5)

## DB Tables
users, streamers, sessions, kingdoms, subscriptions, viewer_profiles

## API Routes (implemented)
- GET/PUT /api/users/me — requires Clerk auth
- GET /api/streamers, /api/streamers/top, /api/streamers/me
- POST /api/streamers/connect-tiktok
- GET /api/kingdoms, /api/kingdoms/me

## Generated API client
Located at `lib/api-client-react/src/generated/api.ts`
Import hooks from `@workspace/api-client-react`

## Task Progress
- Task 1 (Foundation): COMPLETE — DB schema, API routes, Clerk auth, full frontend shell with all 9 pages
- Task 2: TikTok LIVE integration (WebSocket, real-time events)
- Task 3: Gamification engine (XP, levels, achievements)
- Task 4: Kingdoms system (buildings, resources, battles)
- Task 5: Subscriptions/Stripe
- Task 6: OBS overlays (websocket broadcast)
- Task 7: AI assistant

## Demo data seeded
Users: stormking_live (pro), lunavex_official (premium), pixelracer99 (free)
Kingdoms: Luna's Domain (lvl 12), StormKing's Realm (lvl 8), PixelRacer Kingdom (lvl 2)
