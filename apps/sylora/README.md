# SYLORA Flutter client

The official Flutter 3.44.7 client foundation for Android, iOS, Linux, macOS,
Windows, and Web. It talks directly to the SYLORA FastAPI service; it has no
demo data, offline product fixtures, or fake API.

## Backend and configuration

Start the FastAPI backend and its database/Redis dependencies before running the
client. The API must expose the `/v1` identity, social, messaging, wallet,
gifts, AI, live, creator, marketplace, learning, business, and admin routes
described by the backend OpenAPI document.

Development defaults to `http://localhost:8000`:

```sh
flutter run -d linux
flutter run -d chrome
```

Owner local helper (maps device → API origin, checks API health first):

```sh
# from repo root — requires Flutter SDK on your PATH
./scripts/run-flutter-local.sh chrome
./scripts/run-flutter-local.sh ios          # http://127.0.0.1:8000
./scripts/run-flutter-local.sh android      # http://10.0.2.2:8000 (emulator)
SYLORA_LAN_IP=192.168.1.20 ./scripts/run-flutter-local.sh device
```

| Target | API origin |
|---|---|
| Desktop / iOS Simulator | `http://127.0.0.1:8000` |
| Android Emulator | `http://10.0.2.2:8000` |
| Physical device | `http://<PC-LAN-IP>:8000` |

Ensure `ALLOWED_HOSTS` includes `10.0.2.2` (and your LAN IP for physical devices). See `docs/implementation/FLUTTER_MOBILE_INTEGRATION.md`.

Seeded accounts: `owner@sylora.dev` / `OwnerTest!2026Local`.

Set another API origin with a Dart define:

```sh
flutter run -d chrome \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
flutter build web \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
```

`SYLORA_API_BASE_URL` must be an absolute credential-free HTTP(S) URL. Release
builds reject non-HTTPS origins. The configured value is the origin, without
`/v1`; the client adds the API prefix.

## Authentication and token storage

- The access token exists only in process memory on every platform.
- Android, iOS, Linux, macOS, and Windows persist the rotating refresh token
  with `flutter_secure_storage`. Refresh tokens are never written to
  `SharedPreferences`.
- Web keeps the refresh token in memory because browser storage cannot protect a
  bearer secret. A browser reload ends the session until the backend supports a
  BFF or secure HttpOnly-cookie flow.
- Android requires a working platform keystore. Disable unencrypted backup of
  secure-storage material when configuring production backup rules. Configure
  an organization-controlled release signing key before producing a
  distributable Android package; this repository does not fall back to debug
  signing for release builds.
- iOS requires Keychain access in the signed application. macOS requires the
  Keychain Sharing capability for the Runner target.
- Linux requires a Secret Service implementation such as GNOME Keyring and the
  `libsecret-1` runtime/development packages used by the plugin.
- Windows uses the platform credential protection implementation supplied by
  `flutter_secure_storage`.

The Dio client adds bearer and request-ID headers, uses bounded timeouts, parses
RFC 7807 errors, rotates refresh tokens through a single-flight request, retries
one failed request after a successful refresh, and clears authentication when a
refresh token is invalid or reused. Request bodies and tokens are not logged.

## OAuth and realtime platform behavior

Browser OAuth buttons navigate to the real
`/v1/auth/oauth/{provider}/start` route. Providers must be configured by the
backend. Native OAuth buttons remain visibly disabled until each Runner has an
application deep-link callback and the backend redirects to it; the UI explains
this requirement.

The current API authenticates native WebSockets with an `Authorization`
header. Browser WebSockets cannot set arbitrary headers, so Flutter web mints a
one-time ticket over HTTPS (`POST /v1/gifts/events/ticket` or
`POST /v1/messages/events/ticket`) and connects with `?ticket=`. Native clients
may still use bearer headers; ticket auth works on every platform.

## Implemented foundation

- Registration, login, email verification, password reset, MFA challenge, TOTP
  setup/confirm/disable, session revocation, logout, and logout-all
- Auth-guarded named routes, deep-link token consumption, profile editing, API
  account settings, and locally persisted visual/accessibility settings
- Feed, recommendations, draft/publish composer, profiles, social graph actions,
  comments, reactions, bookmarks, reposts, search, notifications, communities,
  conversations, message requests, history, send/read methods, and native
  message sockets
- Wallet balances/history and idempotent top-up/payout requests with honest
  payment-provider-unavailable handling
- Gift catalog, collections/categories repository methods, inventory,
  idempotent purchase/send, preferences, creator monetization, history, event
  replay/native sockets, capability-dependent manifest detail, and complete
  authoring/review repository endpoint coverage
- AI consent/provider state, conversations, HTTP message send, citations, tool
  proposal actions, memory/export, usage, translation/moderation, and
  capability-gated generation jobs
- Live integration status, session creation, preflight/start/end, reveal-once
  stream keys, rotation, MediaMTX ingest details, destination add/remove,
  event/action/persona/rule views, and action approval/execution. Direct ingest
  sessions remain usable when an account lacks integration-management access.
- Creator account onboarding/settings, persisted analytics, content drafts and
  versions, review/publish/schedule/archive/delete actions, S3 upload
  capabilities, processing jobs, tiers, subscriptions, gifts, renewals,
  cancellation, and refunds
- Marketplace catalog search/filter/detail, persisted cart mutation,
  idempotent checkout, order history/detail, entitlements/downloads,
  verified-purchase reviews, seller stores/products/sales/refunds, and service
  booking status/messages
- Learning catalog/curriculum, idempotent paid enrollment, enrollment progress,
  lesson start/heartbeat/completion, quiz attempts and answer recording without
  pre-finalization correctness, final scores, certificate issue/verification,
  and backend PDF rendering
- Business workspace create/switch, members/invitations/teams, CRM companies,
  contacts, stages and deals, tasks, calendar, document upload/verification/
  approval/download, budgets, expenses, invoices, and persisted finance reports
- Admin-only user search/detail/suspend/restore, feature flags/evaluation,
  versioned platform settings, audit history, persisted analytics,
  application-submitted service health, and security dashboards. Secret setting
  values are never rendered.
- Named deep links and role guards for creator, business, seller, and admin
  operations. Compact navigation stays bounded to five destinations and uses a
  role-aware More surface; wider layouts expose permitted workspaces directly.
- Light-first Lumen design, optional dark mode, high contrast, reduced motion,
  text scaling, keyboard focus, accessible touch targets, and responsive bottom
  navigation/rail/expanded rail with context

This foundation intentionally does not capture or encode camera video. Live
sessions expose the server-provided MediaMTX RTMP/WHIP ingest path for external
streaming software without pretending that the Flutter client is publishing.
Gift rendering also reports target capability instead of claiming unsupported
AAA rendering.

The client does not fabricate external provider success. API problems such as
`payment_provider_unavailable`, `storage_provider_unavailable`, processing
unavailability, and certificate PDF storage failures remain explicit UI states.
Upload forms request real short-lived S3 capabilities and display the returned
URL/headers; selecting and streaming local file bytes is not implemented.
Marketplace entitlement responses currently omit product asset IDs, so the
download form requires the asset ID distributed with the purchased product.
Learning curriculum responses currently omit quiz IDs, so quiz deep links
require the ID distributed by the course author. The client does not synthesize
PDF files.

## Verification commands

```sh
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build web \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
```

Tests use an injected `TestTransport` and repository test doubles located only
under `test/`; they do not make network requests.

The verification documented for this feature set covers Flutter analysis, the
automated test suite, and a Web release build. Native platform builds require
their corresponding Flutter toolchains and signing/provisioning and are not
implied by a successful Web build.
