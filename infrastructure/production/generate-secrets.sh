#!/usr/bin/env bash
set -euo pipefail
PROD_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${1:-$PROD_DIR/.env}"
EXAMPLE="$PROD_DIR/.env.example"

if [[ -f "$ENV_FILE" ]]; then
  echo "Refusing to overwrite existing $ENV_FILE" >&2
  exit 1
fi
cp "$EXAMPLE" "$ENV_FILE"

python3 - <<'PY' "$ENV_FILE"
import secrets, sys
from pathlib import Path
from cryptography.fernet import Fernet

path = Path(sys.argv[1])
lines = []
for line in path.read_text().splitlines():
    if line.startswith("POSTGRES_PASSWORD=") and "REPLACE_" in line:
        line = f"POSTGRES_PASSWORD={secrets.token_urlsafe(24)}"
    elif line.startswith("REDIS_PASSWORD=") and "REPLACE_" in line:
        line = f"REDIS_PASSWORD={secrets.token_urlsafe(24)}"
    elif "REPLACE_WITH_64_CHAR_RANDOM" in line:
        line = line.split("=", 1)[0] + "=" + secrets.token_urlsafe(48)
    elif "REPLACE_WITH_FERNET_KEY" in line:
        line = line.split("=", 1)[0] + "=" + Fernet.generate_key().decode()
    elif "REPLACE_WITH_32_PLUS_CHAR_RANDOM" in line:
        line = line.split("=", 1)[0] + "=" + secrets.token_urlsafe(32)
    lines.append(line)
path.write_text("\n".join(lines) + "\n")
print(f"Wrote {path}")
print("Fill DOMAIN, ACME_EMAIL, SMTP_*, S3_*/R2, optional CLOUDFLARE_API_TOKEN next.")
PY
