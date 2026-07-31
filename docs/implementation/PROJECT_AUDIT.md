# Аудит реалізації SYLORA

Дата перевірки: 2026-07-31  
Область перевірки: фактичний вміст `/workspace`; цей звіт не трактує дизайн-наміри як готову функціональність.

## Виконавчий вердикт

Репозиторій є якісно деталізованою React/Vite-галереєю дизайну, а не реалізацією production-платформи. Він містить 38 зареєстрованих екранів, 113 SVG-іконок, дизайн-систему, адаптивні стилі й локальну інтерактивність для огляду станів. Водночас немає product router, API client, доменного або data-access шару, backend, бази даних, постійного сховища, real-time transport, media pipeline, платіжної інтеграції, Flutter-клієнтів, інфраструктури розгортання чи тестових файлів.

Підсумок:

- production-complete екранів: **0 з 38**;
- `Complete` модулів із запитаного production scope: **0**;
- 38 екранів мають статус `Visual-only`, навіть якщо окремі контролі змінюють локальний `useState`;
- видимі користувачі, трансляції, транзакції, аналітика, AI-відповіді, модераційні справи й операційні метрики є статичними fixture-даними;
- поточний застосунок можна використовувати як executable design reference, але не як доказ працездатності продукту.

Цей обсяг неможливо правдиво вважати завершеним за один автономний запуск: потрібні продуктові рішення, зовнішні облікові записи й погодження, backend та data architecture, клієнти, інфраструктура, security/compliance review, тестування і контрольований запуск.

## Шкала класифікації

| Статус | Критерій |
|---|---|
| `Complete` | Наскрізний production flow із серверною авторизацією, персистентністю, обробкою помилок, observability, security controls і релевантними тестами. |
| `Partial` | Існує принаймні один реальний непредставницький production-компонент, але модуль не завершено наскрізно. |
| `Visual-only` | Є UI, стилі або локальна браузерна поведінка, але дані fixture/local-only і немає production service boundary. |
| `Missing` | У репозиторії немає реалізації відповідної capability. |

## Точний інвентар репозиторію

### Верхній рівень

| Область | Фактичний вміст |
|---|---|
| Runtime entry | `index.html`, `src/main.tsx`; `createRoot` монтує тільки `showcase/App`. |
| Package/build | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`. |
| Application source | `src`: рівно 90 файлів — 46 `.tsx`, 24 `.ts`, 20 `.css`. |
| Screens | `src/screens`: 66 файлів — 38 `*Screen.tsx`, 12 group CSS, 12 group `index.ts` включно з порожньою `foundations`, а також `components.tsx`, `data.ts`, `registry.ts`, `types.ts`. |
| Design system | `src/design-system`: 17 файлів — tokens, styles, brand, primitives, shell pattern та icon registry. |
| Gallery shell | `src/showcase`: `App.tsx`, `DeviceFrame.tsx`, `devices.ts`, `showcase.css`. |
| Design artifacts | `design/tokens.figma.json`, `design/contrast-audit.json`. |
| Existing documentation | 11 файлів у `docs/design`: `README.md`, `ACCESSIBILITY.md`, `BRAND.md`, `COMPONENTS.md`, `FIGMA.md`, `FLOWS.md`, `FOUNDATIONS.md`, `MOTION.md`, `PATTERNS.md`, `SCREENS.md`, `SCREEN_AUTHORING_GUIDE.md`. |
| Utility scripts | 9 файлів: `scripts/build-tokens.ts`, `capture.ts`, `shoot.mjs`, `shots.mjs`, `shoot.sh`, `compare.py`, `crop.py`, `contact-sheet.py`, `migrate-lumen.py`. |
| Generated/local directories | `dist` і `node_modules` присутні у workspace, але не становлять product architecture. |

`package.json` оголошує runtime-залежності лише від React, React DOM і font packages; dev-залежності — Vite, TypeScript, Vitest, `tsx` та React type packages. Немає router, HTTP/GraphQL client, schema/ORM, database driver, auth SDK, payment SDK, queue, object-storage client, telemetry SDK або Flutter toolchain.

### Реєстри, які визначають фактичний масштаб

- `src/screens/registry.ts` → `SCREENS` об’єднує 11 непорожніх group registries; `FOUNDATION_SCREENS` порожній.
- `src/screens/types.ts` → `ScreenDefinition` описує лише gallery metadata й React component, без route, loader, permission або service contract.
- `src/design-system/icons/Icon.tsx` → `ICON_PATHS` має **113** ключів; `ICON_NAMES` є `Object.keys(ICON_PATHS)`.
- `src/showcase/App.tsx` → `readLocation()` читає `window.location.hash`, а `App()` тримає `screenId`, theme, device і gallery controls у локальному стані.
- `src/main.tsx` → єдина runtime-гілка рендерить `<App />`; окремої product application composition root немає.

## Архітектурна реальність

Фактичний потік залежностей:

```text
index.html
  → src/main.tsx
    → src/showcase/App.tsx
      → src/screens/registry.ts
        → 38 React screen components
          → src/screens/data.ts + local constants
          → design-system primitives + CSS
```

Це client-only presentation architecture:

1. Gallery navigation — власний hash format `#/<screenId>?device=...`, а не product routing.
2. Shared content — `src/screens/data.ts`; додаткові набори даних оголошені безпосередньо у screen files.
3. Зміни стану — локальний `useState`; після reload вони зникають.
4. Пошук у `src` не знаходить `fetch`, GraphQL, WebSocket/EventSource, browser persistence, router або data-query library.
5. Кнопки на кшталт sign-in, send, publish, pay, follow, moderate, go live та export або не мають handler, або змінюють лише локальне відображення.
6. Текстові згадки `RTMP`, `Stripe`, service health, audit entries, AI citations та payout status не є інтеграціями.

Відсутні архітектурні шари:

- server-side authentication, sessions, authorization policy та tenant boundaries;
- versioned API, domain services, repositories, migrations і transactional persistence;
- event delivery, idempotency, outbox/inbox та background jobs;
- object storage, upload, transcoding, CDN, live ingest, playback і chat relay;
- double-entry ledger, payment orchestration, KYC/KYB, refunds, disputes і reconciliation;
- model gateway, retrieval, prompt/version governance, evaluation та safety controls;
- observability, deployment manifests, secret management, backups, disaster recovery;
- Flutter packages, native platform configuration і store delivery.

## Класифікація requested modules

| Модуль | Статус | Фактичне свідчення | Чого немає до production |
|---|---|---|---|
| Auth | `Visual-only` | `src/screens/entry/AuthScreen.tsx` → `AuthScreen`, `PROVIDERS`, локальні email/password/mode. | Submit flow, passkeys/WebAuthn, OAuth/OIDC callbacks, sessions, MFA, reset, verification, rate limits, account lifecycle. |
| AI | `Visual-only` | `src/screens/assistant/AssistantScreen.tsx` + `AI_CONVERSATION`; approvals змінюють `decisions` у пам’яті. | Model calls, data permissions, retrieval, tool execution, policy, evaluation, cost controls, audit trail. |
| Social | `Visual-only` | Feed, profile, discover, friends, communities, notifications і fixture exports. | Social graph, post service, moderation hooks, ranking, fan-out, privacy enforcement, durable notifications. |
| Creator | `Visual-only` | `CreatorDashboardScreen`, `AnalyticsScreen`, `MonetizationScreen`, `PremiumScreen`. | Content management, real analytics pipeline, entitlements, subscriptions, payout eligibility. |
| Live | `Visual-only` | `LiveViewerScreen`, fixture `STREAMS`/`LIVE_CHAT`, synthetic `Media`. | Ingest, transcode, origin, CDN, playback session, real-time chat, moderation, recording, QoE. |
| Studio | `Visual-only` | `LiveStudioScreen`; panel, transition і audio sliders — local state. | Device capture, encoder, OBS control, scenes/sources persistence, stream keys, health telemetry, start/stop semantics. |
| Gifts | `Visual-only` | `GiftsScreen`, `GIFTS`, `EXTRA_GIFTS`; quantity/selection local-only. | Inventory ownership, atomic debit/credit, fraud controls, refunds policy enforcement, real VFX assets and delivery. |
| Marketplace | `Visual-only` | `MarketplaceScreen`, `DigitalProductsScreen`, `PRODUCTS`, local catalogue/checklist. | Seller onboarding, catalogue DB, upload/delivery, checkout, tax, licensing, orders, refunds. |
| Business | `Visual-only` | `BusinessScreen` із local `PERFORMANCE`, `ROSTER`, `PACING`, `TEAM`. | Organizations, campaigns, budgets, approvals, attribution, invoicing, role enforcement. |
| Learning | `Visual-only` | `CoursesScreen`, `EventsScreen`, `COURSES`, `EVENTS`, local curriculum/calendar. | Enrollment, progress, access control, assessments, certificates, event registration, attendance. |
| Admin | `Visual-only` | `AdminScreen` і `ModeratorScreen`; flags, queue selection та acknowledgement local-only. | Privileged backend, RBAC/ABAC, immutable audit, case workflow, live telemetry, dual control, break-glass access. |
| Backend services | `Missing` | Немає server source, API definition, DB schema, migration або service package. | Увесь service/data plane. |
| Flutter platforms | `Missing` | Немає `.dart`, `pubspec.yaml`, Android/iOS Flutter projects. | Shared Flutter app, platform plugins, signing, stores, push, deep links. |
| Infrastructure | `Missing` | Немає Dockerfile, compose, Terraform/HCL, Kubernetes або CI workflow. | Environments, IaC, deployment, networking, secrets, observability, backup/restore. |
| Security | `Missing` | Є лише UI-тексти й окремі client-side affordances; жодного enforceable security boundary. | Threat model, identity controls, authorization, encryption/key lifecycle, secure SDLC, scanning, incident response. |
| Optimization | `Partial` | Vite build, strict TypeScript, responsive container CSS, generated design tokens. | Runtime budgets, profiling, code splitting strategy, image/video pipeline, cache policy, load/soak tests, SLO-driven tuning. |
| Docs | `Partial` | 11 design docs і inline design rationale. | Product/API/data/security/operations architecture, ADRs, runbooks, data dictionary, compliance records, release procedures. |

## Класифікація всіх 38 екранів

Кожний рядок нижче оцінює production-функцію, а не якість візуального дизайну.

| № | Registry id / екран | Evidence | Статус | Причина |
|---:|---|---|---|---|
| 1 | `welcome` / Welcome | `src/screens/entry/WelcomeScreen.tsx` → `VALUE_PROPS` | `Visual-only` | Static landing presentation; CTA не запускають product flow. |
| 2 | `auth` / Authentication | `src/screens/entry/AuthScreen.tsx` → `AuthScreen`, `PROVIDERS` | `Visual-only` | Поля й mode local-only; sign-in, passkey та providers не інтегровані. |
| 3 | `onboarding` / Onboarding | `src/screens/entry/OnboardingScreen.tsx` → `STEPS`, `INTERESTS`, `selected` | `Visual-only` | Локальний вибір інтересів; немає account/profile persistence або завершення flow. |
| 4 | `home` / Home | `src/screens/core/HomeScreen.tsx` → shared fixtures | `Visual-only` | Компонування `POSTS`, `STREAMS`, `STORIES`, `MISSIONS`, `TRENDING`; немає personalized data source. |
| 5 | `feed` / Feed | `src/screens/core/FeedScreen.tsx` → `source`, `composerOpen`, `POSTS` | `Visual-only` | Tabs/composer/dismissal local-only; немає створення або отримання постів. |
| 6 | `search` / Search | `src/screens/core/SearchScreen.tsx` → `query`, `RESULT_TABS`, fixture matches | `Visual-only` | Client-side перемикання на заздалегідь заданих результатах; немає search index/API. |
| 7 | `discover` / Discover | `src/screens/core/DiscoverScreen.tsx` → `CATEGORIES`, `LONG_FORM`, `GUILD_ITEMS` | `Visual-only` | Локальні shelves/category; ranking і recommendations не існують. |
| 8 | `profile` / Profile | `src/screens/core/ProfileScreen.tsx` → `OWN_POSTS`, `PAST_BROADCASTS`, `VIDEOS`, `TIERS` | `Visual-only` | Fixture profile; subscribe/follow/actions не мають production handler. |
| 9 | `settings` / Settings | `src/screens/core/SettingsScreen.tsx` → local appearance/privacy state | `Visual-only` | Значення не зберігаються й не застосовуються як account policy; є no-op controls. |
| 10 | `notifications` / Notifications | `src/screens/core/NotificationsScreen.tsx` → `NOTIFICATIONS`, `OLDER`, local read/mute | `Visual-only` | Read/mute/thanks живуть лише в component state; немає delivery або durable inbox. |
| 11 | `assistant` / AI Assistant | `src/screens/assistant/AssistantScreen.tsx` → `AI_CONVERSATION`, `decisions` | `Visual-only` | Відповідь і citations статичні; model/tool calls відсутні. |
| 12 | `player` / Video Player | `src/screens/media/PlayerScreen.tsx` → `PLAYED`, `BUFFERED`, `CHAPTERS`, `QUALITIES` | `Visual-only` | Немає media element/source, playback state, DRM, telemetry або captions pipeline. |
| 13 | `stories` / Stories | `src/screens/media/StoriesScreen.tsx` → `SEGMENTS`, `REACTIONS` | `Visual-only` | Static story state; tap/reaction/poll persistence відсутня. |
| 14 | `shorts` / Short Videos | `src/screens/media/ShortsScreen.tsx` → `SHORTS[0..1]` | `Visual-only` | Static reel composition без playback, gesture feed, prefetch або engagement writes. |
| 15 | `long-video` / Long Videos | `src/screens/media/LongVideoScreen.tsx` → `CHAPTERS`, `COMMENTS`, `UP_NEXT` | `Visual-only` | Локальний tab; VOD, comments, recommendations і history не під’єднані. |
| 16 | `live-viewer` / Live Streaming | `src/screens/live/LiveViewerScreen.tsx` → `STREAMS`, `LIVE_CHAT`, `GIFTS` | `Visual-only` | Немає stream transport/player/socket; controls і gift actions не виконуються. |
| 17 | `live-studio` / Live Studio | `src/screens/live/LiveStudioScreen.tsx` → `SCENES`, `SOURCES`, `HEALTH`, local sliders | `Visual-only` | Synthetic monitors/health; немає capture, encoder, OBS або ingest control. |
| 18 | `chat` / Chat | `src/screens/comms/ChatScreen.tsx` → `THREAD`, `EARLIER` | `Visual-only` | Static thread, decorative typing/receipts; composer не відправляє повідомлення. |
| 19 | `messages` / Messages | `src/screens/comms/MessagesScreen.tsx` → `CONVERSATIONS`, local tab | `Visual-only` | Fixture inbox; немає thread loading, delivery, unread persistence або requests policy. |
| 20 | `friends` / Friends | `src/screens/comms/FriendsScreen.tsx` → `REQUESTS`, `PEOPLE`, local tab | `Visual-only` | Accept/decline/follow/import/invite не змінюють social graph. |
| 21 | `communities` / Communities | `src/screens/comms/CommunitiesScreen.tsx` → `COMMUNITIES`, `DISCOVER`, `CHANNELS` | `Visual-only` | Static spaces; join/create/channel actions не мають backend. |
| 22 | `creator-dashboard` / Creator dashboard | `src/screens/creator/CreatorDashboardScreen.tsx` → `HERO`, `UPLOADS`, `COMMENTS` | `Visual-only` | Range/checklist local-only; метрики й uploads fixture-based. |
| 23 | `analytics` / Analytics | `src/screens/creator/AnalyticsScreen.tsx` → `METRICS`, `TRAFFIC`, `RETENTION`, `TOP_CONTENT` | `Visual-only` | Charts рахуються з локальних масивів; немає telemetry warehouse/query. |
| 24 | `monetization` / Monetization | `src/screens/creator/MonetizationScreen.tsx` → local `STREAMS`, computed `NET` | `Visual-only` | Арифметика реальна лише над fixture values; немає ledger/payout/KYC. |
| 25 | `premium` / Premium subscription | `src/screens/creator/PremiumScreen.tsx` → `PLANS`, `COMPARISON`, local cycle | `Visual-only` | Перерахунок plan display local-only; checkout та entitlement відсутні. |
| 26 | `marketplace` / Marketplace | `src/screens/commerce/MarketplaceScreen.tsx` → `PRODUCTS`, local filters | `Visual-only` | Фільтри local-only; немає catalogue/search/cart/order/payment. |
| 27 | `digital-products` / Digital Products | `src/screens/commerce/DigitalProductsScreen.tsx` → `CATALOGUE`, `FILES`, `CHECKLIST` | `Visual-only` | Edit fields і publish gate не зберігають та не доставляють продукт. |
| 28 | `wallet` / Wallet | `src/screens/commerce/WalletScreen.tsx` → `TRANSACTIONS`, `PACKAGES`, `METHODS` | `Visual-only` | Баланс і transactions fixture-based; top-up/payout/payment methods не інтегровані. |
| 29 | `gifts` / Virtual Gifts | `src/screens/commerce/GiftsScreen.tsx` → `GIFTS`, `EXTRA_GIFTS`, selection/quantity | `Visual-only` | Preview й total local-only; немає ledger debit, ownership або effect delivery. |
| 30 | `inventory` / Inventory | `src/screens/commerce/InventoryScreen.tsx` → `ITEMS`, `SLOTS`, `EXPIRING` | `Visual-only` | Static collection; equip/expiry/ownership semantics відсутні. |
| 31 | `courses` / Courses | `src/screens/learning/CoursesScreen.tsx` → `COURSES`, `CURRICULUM`, `OUTCOMES` | `Visual-only` | Category/module state local-only; enrollment/progress/access відсутні. |
| 32 | `events` / Events | `src/screens/learning/EventsScreen.tsx` → `EVENTS`, `CALENDAR`, `AGENDA` | `Visual-only` | View/day local-only; registration, capacity, ticketing, reminders відсутні. |
| 33 | `leaderboards` / Leaderboards | `src/screens/game/LeaderboardsScreen.tsx` → `LEADERBOARD`, local filters | `Visual-only` | Static rankings; немає score ingestion, anti-abuse або period snapshots. |
| 34 | `achievements` / Achievements | `src/screens/game/AchievementsScreen.tsx` → `ACHIEVEMENTS`, `COUNTS`, `HOW_TO_EARN` | `Visual-only` | Tier filter local-only; award rules і authoritative progress відсутні. |
| 35 | `missions` / Missions | `src/screens/game/MissionsScreen.tsx` → `MISSIONS`, `DAILY`, `SEASONAL`, `TRACK` | `Visual-only` | Static progress/rewards; немає event evaluation або atomic grant. |
| 36 | `admin` / Admin panel | `src/screens/ops/AdminScreen.tsx` → `HEALTH`, `SERVICES`, `FLAGS`, `AUDIT` | `Visual-only` | Filters/toggles local-only; дані не operational, controls не privileged. |
| 37 | `moderator` / Moderator dashboard | `src/screens/ops/ModeratorScreen.tsx` → `MODERATION_QUEUE`, `DETAIL`, acknowledgement | `Visual-only` | Case selection/gate local-only; decisions, evidence chain і audit не записуються. |
| 38 | `business` / Business dashboard | `src/screens/ops/BusinessScreen.tsx` → `PERFORMANCE`, `ROSTER`, `PACING`, `TEAM` | `Visual-only` | Range local-only; campaign/finance/team data не мають service source. |

## Shared fixture exports

`src/screens/data.ts` експортує 24 value fixtures:

1. `CREATORS`
2. `ME`
3. `POSTS`
4. `STREAMS`
5. `LIVE_CHAT`
6. `GIFTS`
7. `PRODUCTS`
8. `COURSES`
9. `EVENTS`
10. `COMMUNITIES`
11. `NOTIFICATIONS`
12. `CONVERSATIONS`
13. `THREAD`
14. `TRANSACTIONS`
15. `ACHIEVEMENTS`
16. `MISSIONS`
17. `LEADERBOARD`
18. `MODERATION_QUEUE`
19. `AI_CONVERSATION`
20. `ANALYTICS_SERIES`
21. `STORIES`
22. `SHORTS`
23. `SEARCH_SUGGESTIONS`
24. `TRENDING`

Файл також експортує 15 shape interfaces: `Creator`, `Post`, `Stream`, `ChatMessage`, `Gift`, `Product`, `Course`, `EventItem`, `Community`, `NotificationItem`, `Conversation`, `Transaction`, `Achievement`, `Mission`, `ModerationCase`. Це TypeScript presentation shapes, не API/domain contracts.

## Major local fixture arrays

| Screen file | Локальні масиви або похідні fixture collections |
|---|---|
| `entry/WelcomeScreen.tsx` | `VALUE_PROPS` |
| `entry/AuthScreen.tsx` | `PROVIDERS` |
| `entry/OnboardingScreen.tsx` | `STEPS`, `INTERESTS` |
| `core/HomeScreen.tsx` | Немає великого local fixture; композиція shared exports. |
| `core/FeedScreen.tsx` | `COMPOSER_TYPES`, `POLL_OPTIONS`, `DIGEST_THREADS` |
| `core/SearchScreen.tsx` | `RESULT_TABS`, `FILTERS`, `RECENT`, `MATCHED_CREATORS` |
| `core/DiscoverScreen.tsx` | `CATEGORIES`, `LONG_FORM`, `GUILD_ITEMS` |
| `core/ProfileScreen.tsx` | `OWN_POSTS`, `PAST_BROADCASTS`, `VIDEOS`, `TIERS` |
| `core/SettingsScreen.tsx` | `SECTIONS`, `ACCENTS`, `THEMES` |
| `core/NotificationsScreen.tsx` | `OLDER`, `ALL_ITEMS`, `GROUP_LABELS` |
| `assistant/AssistantScreen.tsx` | `MODES`, `RECENT` |
| `media/PlayerScreen.tsx` | `CHAPTERS`, `QUALITIES` |
| `media/StoriesScreen.tsx` | `SEGMENTS`, `REACTIONS` |
| `media/ShortsScreen.tsx` | Немає; прямий вибір зі shared `SHORTS`. |
| `media/LongVideoScreen.tsx` | `CHAPTERS`, `COMMENTS`, `UP_NEXT` |
| `live/LiveViewerScreen.tsx` | Немає; композиція shared `STREAMS`, `LIVE_CHAT`, `GIFTS`. |
| `live/LiveStudioScreen.tsx` | `SCENES`, `SOURCES`, `HEALTH`, `ACTIVITY` |
| `comms/ChatScreen.tsx` | `EARLIER`; додаткові inline shared-file/media collections |
| `comms/MessagesScreen.tsx` | `PINNED`, `REST`, `TABS` |
| `comms/FriendsScreen.tsx` | `TABS`, `REQUESTS`, `PEOPLE`, `FIND_TILES` |
| `comms/CommunitiesScreen.tsx` | `DISCOVER`, `CHANNELS` |
| `creator/CreatorDashboardScreen.tsx` | `RANGES`, `UPLOADS`, `COMMENTS`; `HERO` — local range map |
| `creator/AnalyticsScreen.tsx` | `DAYS`, `METRICS`, `TRAFFIC`, `DEVICES`, `GEOGRAPHY`, `RETENTION`, `TOP_CONTENT`, `COLUMNS` |
| `creator/MonetizationScreen.tsx` | local `STREAMS`, `EARNING`, `ELIGIBILITY` |
| `creator/PremiumScreen.tsx` | `PLANS`, `COMPARISON`, `FAQ` |
| `commerce/MarketplaceScreen.tsx` | `CATEGORIES`, `STAFF_PICKS`; `REVIEWS` — local map |
| `commerce/DigitalProductsScreen.tsx` | `CATALOGUE`, `FILES`, `CHECKLIST` |
| `commerce/WalletScreen.tsx` | `PACKAGES`, `METHODS`, `DATE_ORDER` |
| `commerce/GiftsScreen.tsx` | `EXTRA_GIFTS`, `CATALOGUE`, `TIERS`, `RECENT` |
| `commerce/InventoryScreen.tsx` | `ITEMS`, `SLOTS`, `LEGEND`, `EXPIRING` |
| `learning/CoursesScreen.tsx` | `CATEGORIES`, `CURRICULUM`, `OUTCOMES` |
| `learning/EventsScreen.tsx` | `WEEKDAYS`, `CALENDAR`, `HOSTING`, `AGENDA` |
| `game/LeaderboardsScreen.tsx` | `CATEGORIES`, `MEDALS`, `PODIUM_ORDER` |
| `game/AchievementsScreen.tsx` | `TIERS`, `HOW_TO_EARN`; `COUNTS`/`RARITY` — local maps |
| `game/MissionsScreen.tsx` | `DAILY`, `SEASONAL`, `TRACK`, `WEEK` |
| `ops/AdminScreen.tsx` | `HEALTH`, `SERVICES`, `USERS`, `FLAGS`, `AUDIT` |
| `ops/ModeratorScreen.tsx` | `QUEUE`, `QUEUE_STATS`; `DETAIL` — local evidence map |
| `ops/BusinessScreen.tsx` | `PERFORMANCE`, `ROSTER`, `PACING`, `TEAM` |

## Перевірені негативні твердження

За результатами filesystem та source search:

- 0 test/spec files;
- 0 `.dart` files;
- 0 database schema/migration files (`.sql`, `.prisma`);
- 0 Terraform/HCL files;
- 0 Dockerfile/compose manifests;
- 0 OpenAPI documents;
- 0 CI workflow files у `.github`;
- 0 викликів `fetch`, WebSocket, EventSource або browser persistence у `src`;
- 0 production backend entrypoints.

Отже, UI-тексти про 2FA, live regions, payouts, audit, model hosting, service uptime чи encryption не є доказом реалізації відповідних controls.
