#!/usr/bin/env bash
# Frontend/auth source smoke tests for Sylora.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${ROOT}/apps/web"
npm run test:unit
echo "OK  frontend unit tests"
