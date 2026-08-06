# SYLORA — Product specification (v2)

## Vision

SYLORA is an **AI-first digital ecosystem** — a new class of platform that unifies social networking, short and long-form video, live streaming, realtime communication, creator economy, education, and business tooling in one coherent product.

SYLORA is **not** a clone of TikTok, YouTube, Twitch, Discord, Patreon, LinkedIn, Coursera, or ChatGPT. It defines its own interaction model, visual language, and domain boundaries.

## Product principles

1. **No simulated readiness** — features are shipped only when end-to-end flows work against real backends.
2. **AI-native** — the assistant is embedded across surfaces with explicit permissions and tool boundaries.
3. **Creator-first economics** — gifts, subscriptions, and ledger-backed transactions are first-class.
4. **Global by design** — localization architecture from day one (UK, PL, EN initially).
5. **Scale path** — modular monolith first; extract services only when metrics justify it.

## Core domains (bounded contexts)

| Domain | Responsibility |
|--------|----------------|
| **Identity** | Auth, sessions, MFA, OAuth, roles, verification |
| **Profile** | User/creator/business profiles, privacy, blocks |
| **Social Graph** | Follows, friends, recommendations inputs |
| **Content** | Posts, media metadata, feeds, reactions, comments |
| **Clips** | Vertical short-video experience |
| **Video** | Long-form channels, uploads, processing pipeline |
| **Live** | Sessions, ingest, chat, moderation, replay |
| **Creator Studio** | Scenes, sources, OBS/RTMP integration |
| **Gifts** | Catalog, engine, realtime delivery, revenue |
| **Wallet** | Ledger, balances, purchases, payouts |
| **Messaging** | DM, groups, delivery/read state |
| **Communities** | Spaces, channels, roles, events |
| **Learning** | Courses, progress, certificates |
| **Business** | Company pages, services, jobs |
| **AI** | Assistant, tools, memory permissions, live co-host |
| **Search** | Full-text + semantic discovery |
| **Moderation** | Reports, queues, appeals, audit |
| **Notifications** | In-app, email, push architecture |
| **Admin** | Operations console |

## Phased delivery

See [ROADMAP.md](./ROADMAP.md).

## Non-goals (Phase 0–1)

- Claiming AGI or human impersonation
- Undocumented third-party platform APIs (TikTok Live without official access)
- Microservices for every domain on day one
- Flutter Web as the primary production web client
