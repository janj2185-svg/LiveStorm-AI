#!/usr/bin/env bash
set -euo pipefail
fail=0
check() {
  local name="$1"; shift
  local out
  if out="$("$@" 2>&1)"; then
    echo "OK  $name ($out)"
  else
    echo "FAIL $name"
    fail=1
  fi
}
check git git --version
check node node --version
check npm npm --version
check python python3 --version
check docker docker --version
check compose docker compose version
if dpkg -s nginx >/dev/null 2>&1 || docker image inspect nginx:1.27-alpine >/dev/null 2>&1; then
  echo "OK  nginx_pkg"
else
  echo "FAIL nginx_pkg"
  fail=1
fi
if curl -fsS http://127.0.0.1/health >/dev/null 2>&1; then
  echo "OK  http_health ($(curl -fsS http://127.0.0.1/health))"
else
  echo "FAIL http_health"
  fail=1
fi
exit "$fail"
