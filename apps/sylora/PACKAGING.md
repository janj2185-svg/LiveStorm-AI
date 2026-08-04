# SYLORA client packaging checklist

Run commands from `apps/sylora`. Replace the example API origin with the
production HTTPS origin (without `/v1`) and supply release version values from
the release process:

```sh
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
```

All release builds should include:

```text
--release
--build-name=<semver>
--build-number=<integer>
--dart-define=SYLORA_API_BASE_URL=https://api.example.com
```

Do not put signing credentials, Firebase configuration, service accounts, API
tokens, or passwords in Dart defines. Dart defines are embedded in the client.

## Push packaging gate

The repository intentionally does **not** depend on `firebase_messaging`.
`google-services.json` and `GoogleService-Info.plist` are also absent. The base
build uses `NoopPushTokenProvider`, shows push as not configured, and cannot
register a device token. This keeps every existing target buildable when
Firebase files and signing capabilities are unavailable.

`pushTokenProviderProvider` is the client extension point. A separately
maintained Firebase-enabled packaging variant must:

1. Add compatible `firebase_core` and `firebase_messaging` dependencies.
2. Add the Android Google Services plugin and the environment-specific
   `android/app/google-services.json`.
3. Add the environment-specific `GoogleService-Info.plist` to the iOS/macOS
   Runner target, enable Push Notifications, and configure the appropriate
   background mode and APNs entitlement.
4. Initialize Firebase before `runApp`.
5. Implement `PushTokenProvider` using `FirebaseMessaging.getToken()` and
   `FirebaseMessaging.onTokenRefresh`.
6. Override `pushTokenProviderProvider` in the root `ProviderScope`.
7. Configure the API's FCM HTTP v1 dispatcher with deployment-managed secrets
   and verify that `POST /v1/push/devices` returns `201`.

A Dart define can select that adapter in the Firebase-enabled variant, for
example `--dart-define=SYLORA_PUSH_PROVIDER=fcm`, but a define cannot add a Dart
package or native Firebase configuration at compile time. The base entry point
therefore does not claim that this define enables FCM.

**Blocked without secrets/configuration:** end-to-end push delivery, APNs
registration, FCM web VAPID setup, and store-ready Firebase builds.

## Web

```sh
flutter build web --release \
  --build-name=<semver> \
  --build-number=<integer> \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
./tooling/patch-web-bootstrap.sh
```

The bootstrap patch is mandatory after every web build. It removes Flutter's
generated service-worker registration and prefers CDN CanvasKit. Serve
`build/web` over HTTPS, then check routing, API CORS, CSP, asset caching, and
that no stale service worker controls the page.

**Signing gate:** none. TLS certificates and deployment credentials are still
required. Web push is blocked until a Firebase-enabled variant supplies the
Firebase web app configuration, VAPID key, service worker, and token provider.

## Android

```sh
flutter build appbundle --release \
  --build-name=<semver> \
  --build-number=<integer> \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
# Optional direct-install artifact:
flutter build apk --release --split-per-abi \
  --build-name=<semver> \
  --build-number=<integer> \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
```

Before distribution, configure an organization-controlled upload keystore and
wire the release signing config into `android/app/build.gradle.kts`. Verify the
application ID, SDK policy, backup rules for secure storage, Play App Signing,
and Play Console declarations.

**Blocked without secrets/configuration:** the repository has no release
keystore configuration, so no store-ready signed AAB can be produced. FCM also
requires the Firebase-enabled variant and `google-services.json`.

## iOS

Requires macOS, Xcode, CocoaPods, and an Apple Developer team:

```sh
flutter build ipa --release \
  --build-name=<semver> \
  --build-number=<integer> \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com \
  --export-options-plist=<path-to-ExportOptions.plist>
```

Verify the bundle ID, distribution certificate, provisioning profile, Keychain
access, privacy strings, capabilities, App Store Connect record, and export
method. For push, add the APNs entitlement and Firebase plist only in the
Firebase-enabled variant.

**Blocked without secrets/configuration:** this repository has no distribution
certificate, provisioning profile, export options plist, App Store Connect
credentials, APNs key, or Firebase plist.

## macOS

Requires macOS, Xcode, and an Apple Developer team:

```sh
flutter build macos --release \
  --build-name=<semver> \
  --build-number=<integer> \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
```

Archive in Xcode for distribution. Verify Developer ID/App Store signing,
sandbox and Keychain entitlements, hardened runtime, notarization, stapling,
privacy strings, and the selected distribution channel.

**Blocked without secrets/configuration:** a distributable artifact requires
Apple signing identities and profiles; outside-store distribution additionally
requires notarization credentials. Push requires APNs/Firebase configuration.

## Linux

On a Linux builder with Flutter's Linux desktop prerequisites:

```sh
flutter build linux --release \
  --build-name=<semver> \
  --build-number=<integer> \
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
```

Package the complete `build/linux/*/release/bundle` directory. Declare runtime
libraries, including Secret Service/libsecret support, in the target package
format and sign repository metadata or the final package according to the
distribution channel.

**Blocked without secrets/configuration:** repository/package signing and
publishing require distribution-specific keys. Native FCM token acquisition is
not provided for this target.

## Windows

On a Windows builder with Visual Studio's Desktop development with C++ tools:

```powershell
flutter build windows --release `
  --build-name=<semver> `
  --build-number=<integer> `
  --dart-define=SYLORA_API_BASE_URL=https://api.example.com
```

Package the full release runner output as MSIX or with the chosen installer.
Verify publisher identity, runtime prerequisites, upgrade behavior, uninstall,
and code-sign both binaries and installer.

**Blocked without secrets/configuration:** a trusted distributable requires a
code-signing certificate and timestamping service credentials. Native FCM token
acquisition is not provided for this target.

## Release evidence

Record the Flutter version, dependency lockfile checksum, source commit,
commands, build logs, artifact checksums, signer identity, and smoke-test
results. A successful web or desktop build does not prove that another platform
is packageable. Never mark a platform ready when its signing or provider gate is
blocked.
