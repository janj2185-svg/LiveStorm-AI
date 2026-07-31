#!/usr/bin/env bash
# Ad-hoc capture helper for the light-theme audit. Scratch tooling, not shipped.
# usage: shoot.sh OUTDIR "screen1 screen2" "iphone tablet desktop" "light dark"
set -u
OUT="$1"; SCREENS="$2"; DEVICES="${3:-iphone tablet desktop}"; THEMES="${4:-light dark}"
BASE="${BASE:-http://localhost:4173}"
mkdir -p "$OUT"
for d in $DEVICES; do
  case "$d" in
    iphone)  W=440;  H=900 ;;
    android) W=460;  H=960 ;;
    tablet)  W=880;  H=1250 ;;
    desktop) W=1560; H=1000 ;;
    web)     W=1330; H=880 ;;
  esac
  for t in $THEMES; do
    for s in $SCREENS; do
      P=$(mktemp -d /tmp/sy-chrome-XXXXXX)
      timeout 90 /opt/google/chrome/chrome --headless=new --no-sandbox --disable-gpu \
        --user-data-dir="$P" --window-size=$W,$H --virtual-time-budget=9000 --force-device-scale-factor=1 \
        --screenshot="$OUT/${s}__${d}__${t}.png" \
        "$BASE/#/${s}?device=${d}&theme=${t}&chrome=0" >/dev/null 2>&1
      rm -rf "$P"
      echo "  ${s}__${d}__${t}.png"
    done
  done
done
echo "done -> $OUT"
