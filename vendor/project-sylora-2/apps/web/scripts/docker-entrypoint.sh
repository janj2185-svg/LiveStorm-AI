#!/bin/sh
set -eu
echo "Running Sylora auth schema migration..."
node ./scripts/migrate-auth.mjs
echo "Starting Next.js..."
exec npm run start -- --hostname 0.0.0.0 --port 3000
