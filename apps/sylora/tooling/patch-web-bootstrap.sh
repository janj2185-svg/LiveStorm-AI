#!/usr/bin/env bash
# Flutter web bootstrap auto-registers a service worker that can pin stale
# CanvasKit/main.dart.js and make "Почати" hang. Strip SW registration after
# every `flutter build web`.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOTSTRAP="$ROOT/build/web/flutter_bootstrap.js"
if [[ ! -f "$BOOTSTRAP" ]]; then
  echo "missing $BOOTSTRAP" >&2
  exit 1
fi
python3 - <<PY
from pathlib import Path
import re
p = Path("$BOOTSTRAP")
t = p.read_text()
t2, n = re.subn(
    r"_flutter\\.loader\\.load\\(\\{[\\s\\S]*?\\}\\);\\s*$",
    "_flutter.loader.load({\\n  config: { canvasKitBaseUrl: 'canvaskit/' }\\n});\\n",
    t,
    count=1,
)
if n != 1:
    raise SystemExit(f"bootstrap patch failed n={n}")
p.write_text(t2)
print("patched flutter_bootstrap.js (service worker disabled)")
PY
