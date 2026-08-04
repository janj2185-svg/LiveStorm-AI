#!/usr/bin/env bash
# Honest packaging smoke for SYLORA Flutter targets available on this host.
# Skips targets that cannot run; never fakes success.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> flutter doctor (summary)"
flutter doctor -v | sed -n '1,80p' || true

attempt() {
  local name="$1"
  shift
  echo
  echo "==> BUILD: $name"
  if "$@" ; then
    echo "OK: $name"
    return 0
  fi
  echo "SKIP/FAIL: $name (see logs above — not claimed ready)"
  return 0
}

attempt "web" flutter build web --release
if [[ -x tooling/patch-web-bootstrap.sh ]]; then
  echo "==> patching web bootstrap"
  ./tooling/patch-web-bootstrap.sh || echo "web patch skipped"
fi

# Native targets only when SDKs present
if command -v sdkmanager >/dev/null 2>&1 || [[ -n "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ]]; then
  attempt "android-apk" flutter build apk --release
else
  echo "SKIP: android-apk (Android SDK not detected)"
fi

case "$(uname -s)" in
  Darwin)
    attempt "ios-no-codesign" flutter build ios --release --no-codesign
    attempt "macos" flutter build macos --release
    ;;
  Linux)
    attempt "linux" flutter build linux --release
    ;;
  MINGW*|MSYS*|CYGWIN*|Windows_NT)
    attempt "windows" flutter build windows --release
    ;;
esac

echo
echo "Done. Signing/store upload still requires owner secrets — see PACKAGING.md."
