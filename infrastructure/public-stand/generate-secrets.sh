#!/usr/bin/env bash
# Generate secrets for infrastructure/public-stand/.env without printing them twice.
set -euo pipefail
STAND_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${1:-$STAND_DIR/.env}"
EXAMPLE="$STAND_DIR/.env.example"

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
text = path.read_text()
replacements = {
    "REPLACE_WITH_STRONG_PASSWORD": secrets.token_urlsafe(24),
    "REPLACE_WITH_64_CHAR_RANDOM": secrets.token_urlsafe(48),
    "REPLACE_WITH_FERNET_KEY": Fernet.generate_key().decode(),
    "REPLACE_WITH_32_PLUS_CHAR_RANDOM": secrets.token_urlsafe(32),
}
# Distinct passwords for postgres/redis
out = []
used_pg = False
used_redis = False
for line in text.splitlines():
    if line.startswith("POSTGRES_PASSWORD=") and "REPLACE_WITH_STRONG_PASSWORD" in line:
        line = f"POSTGRES_PASSWORD={secrets.token_urlsafe(24)}"
        used_pg = True
    elif line.startswith("REDIS_PASSWORD=") and "REPLACE_WITH_STRONG_PASSWORD" in line:
        line = f"REDIS_PASSWORD={secrets.token_urlsafe(24)}"
        used_redis = True
    else:
        for needle, value in replacements.items():
            if needle in line and not line.startswith("POSTGRES_PASSWORD=") and not line.startswith("REDIS_PASSWORD="):
                line = line.replace(needle, value)
                break
    out.append(line)
path.write_text("\n".join(out) + "\n")
print(f"Wrote {path} with generated secrets. Edit STAND_DOMAIN and ACME_EMAIL next.")
assert used_pg and used_redis
PY

echo "Next:"
echo "  1. Edit STAND_DOMAIN + ACME_EMAIL in $ENV_FILE"
echo "  2. Point DNS A/AAAA to this VPS"
echo "  3. ./infrastructure/public-stand/deploy.sh"
echo "Do NOT commit $ENV_FILE."
