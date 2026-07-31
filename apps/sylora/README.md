# SYLORA Flutter client

The official Flutter 3.44.7 client foundation for Android, iOS, Linux, macOS,
Windows, and Web. It talks directly to the SYLORA FastAPI service; it has no
demo data, offline product fixtures, or fake API.

## Backend and configuration

Start the FastAPI backend and its database/Redis dependencies before running the
client. The API must expose the `/v1` identity, social, messaging, wallet, gifts,
AI, and live routes described by the backend OpenAPI document.

Development defaults to `http://localhost:8000`:

```sh
flutter run -d linux
flutter run -d chrome
```

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

The current API authenticates WebSockets with an `Authorization` header. Native
Flutter sockets can send that header and reconnect with bounded exponential
backoff plus replay cursors. Browser WebSockets cannot set arbitrary headers, so
Web explicitly reports realtime sockets as unavailable while HTTP history and
refresh continue to work. A cookie/BFF or ticket-based socket handshake is
required to enable browser realtime safely.

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
- Light-first Lumen design, optional dark mode, high contrast, reduced motion,
  text scaling, keyboard focus, accessible touch targets, and responsive bottom
  navigation/rail/expanded rail with context

This foundation intentionally does not capture or encode camera video. Live
sessions expose the server-provided MediaMTX RTMP/WHIP ingest path for external
streaming software without pretending that the Flutter client is publishing.
Gift rendering also reports target capability instead of claiming unsupported
AAA rendering.

## Verification commands

```sh
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build web \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
flutter build linux \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
```

Tests use an injected `TestTransport` and repository test doubles located only
under `test/`; they do not make network requests.

This Linux validation run built:

- Web release output, including the Wasm dry run.
- Linux x64 release bundle.
- Android release APK (unsigned, because no organization release key is stored
  in the repository).
- Android debug APK signed by the generated local debug key for emulator/device
  testing.

iOS and macOS still require Xcode and signing/provisioning on macOS. Windows
requires the Windows Flutter/Visual Studio toolchain. CI has separate compile
jobs for Linux/Web/Android, iOS/macOS without code signing, and Windows; a
passing Linux run alone is not evidence that Apple or Windows binaries compile.
