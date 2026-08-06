# SYLORA — Roadmap

## Phase 0 — Foundation ✅ (in progress)

- [x] Product & architecture documentation
- [x] Repository structure (`apps/web`, `services/platform-api`, `packages/ui`)
- [x] Docker Compose dev stack (PostgreSQL, Redis)
- [x] FastAPI skeleton with health/ready endpoints
- [x] Next.js web shell with design system + i18n (UK, PL, EN)
- [x] CI: lint + test gates
- [ ] Local smoke verification documented

## Phase 1 — Working core

- Auth: register, login, logout, refresh, email verification, password reset
- Profile: handle, avatar, bio, privacy
- Social graph: follow, block
- Content: posts, comments, reactions
- Feed: chronological + following
- Notifications: in-app
- Search: users + posts (PostgreSQL full-text)
- Admin: user list, feature flags shell
- Localization: UK, PL, EN complete for Phase 1 surfaces

**Exit criteria:** User A registers, posts, User B sees post, reacts, follows, receives notification.

## Phase 2 — Video & creator

- Clips vertical player
- Long-form upload + processing pipeline (FFmpeg worker)
- Creator dashboard analytics

## Phase 3 — LIVE

- WebRTC/RTMP ingest architecture
- Live chat, moderation
- OBS WebSocket companion

## Phase 4 — Gifts & monetization

- Wallet + immutable ledger
- Gift catalog + Gift Engine renderer
- One legendary gift E2E testable by owner

## Phase 5 — AI

- Assistant with tools + memory permissions
- AI Live co-host
- Translation layer

## Phase 6 — Communities, messaging+, learning, business

## Phase 7 — Native apps, scale hardening
