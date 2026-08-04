#!/usr/bin/env bash
# Flutter web bootstrap auto-registers a service worker that can pin stale
# CanvasKit/main.dart.js and make "Почати" hang. Strip SW registration after
# every `flutter build web`.
#
# Keep CanvasKit on the Flutter CDN when possible — do NOT force
# canvasKitBaseUrl: 'canvaskit/'. Self-hosting ~7MB wasm with Cache-Control
# no-store made every "Почати" re-download the engine.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOTSTRAP="$ROOT/build/web/flutter_bootstrap.js"
if [[ ! -f "$BOOTSTRAP" ]]; then
  echo "missing $BOOTSTRAP" >&2
  exit 1
fi
python3 - "$BOOTSTRAP" <<'PY'
from pathlib import Path
import re
import sys

p = Path(sys.argv[1])
t = p.read_text()
replacement = "_flutter.loader.load({\n});\n"
t2, n = re.subn(
    r"_flutter\.loader\.load\(\{[\s\S]*?\}\);\s*$",
    replacement,
    t,
    count=1,
)
if n != 1:
    raise SystemExit(f"bootstrap patch failed n={n}")
# Prefer CDN CanvasKit when buildConfig includes an engine revision.
t2 = t2.replace('"useLocalCanvasKit":true', '"useLocalCanvasKit":false')
p.write_text(t2)
print("patched flutter_bootstrap.js (SW off, CanvasKit CDN preferred)")
PY
