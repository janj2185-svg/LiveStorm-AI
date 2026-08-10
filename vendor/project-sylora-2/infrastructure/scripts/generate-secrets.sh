#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ ! -f .env ]]; then
  cp .env.example .env
fi
PW=$(openssl rand -hex 16)
SK=$(openssl rand -hex 32)
AUTH=$(openssl rand -base64 32 | tr -d '\n')
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${PW}/" .env
sed -i "s/^SECRET_KEY=.*/SECRET_KEY=${SK}/" .env
if grep -q '^AUTH_SECRET=' .env; then
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=${AUTH}|" .env
else
  printf '\nAUTH_SECRET=%s\n' "${AUTH}" >> .env
fi
if ! grep -q '^AUTH_URL=' .env; then
  printf 'AUTH_URL=https://getsylora.com\n' >> .env
fi
echo "Updated POSTGRES_PASSWORD, SECRET_KEY, and AUTH_SECRET in .env"
