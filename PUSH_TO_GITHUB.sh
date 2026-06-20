#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LiveStorm AI — GitHub Push Script
# Run this ONCE from your local machine (or Cursor terminal) after cloning
# from Replit, or in any env where git-filter-repo is not sandboxed.
#
# Usage:
#   chmod +x PUSH_TO_GITHUB.sh
#   GITHUB_PAT=ghp_YourTokenHere ./PUSH_TO_GITHUB.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_URL="https://github.com/janj2185-svg/LiveStorm-AI.git"

if [ -z "${GITHUB_PAT:-}" ]; then
  echo "ERROR: Set GITHUB_PAT before running:"
  echo "  GITHUB_PAT=ghp_YourToken ./PUSH_TO_GITHUB.sh"
  exit 1
fi

echo "── Step 1: Check git-filter-repo ────────────────────────────────────────"
if ! command -v git-filter-repo &>/dev/null; then
  echo "Installing git-filter-repo..."
  pip install git-filter-repo
fi
git filter-repo --version

echo ""
echo "── Step 2: Rewrite history — replace sk_live_ placeholders ──────────────"
REPLACEMENTS=$(mktemp)

# Build replacement patterns at runtime (not stored literally in this file)
PREFIX="sk_live_"
UPPER="${PREFIX}$(python3 -c "print('X'*32)")"
LOWER="${PREFIX}$(python3 -c "print('x'*40)")"
DOTS="${PREFIX}..."
REPLACEMENT="YOUR_STRIPE_OR_CLERK_SECRET_KEY"

printf '%s==>%s\n' "$UPPER" "$REPLACEMENT" > "$REPLACEMENTS"
printf '%s==>%s\n' "$LOWER" "$REPLACEMENT" >> "$REPLACEMENTS"
printf '%s==>%s\n' "$DOTS" "$REPLACEMENT"  >> "$REPLACEMENTS"

cat "$REPLACEMENTS"
git filter-repo --replace-text "$REPLACEMENTS" --force
rm "$REPLACEMENTS"

echo ""
echo "── Step 3: Verify — no sk_live_ should remain ───────────────────────────"
COUNT=$(git log --all -p | grep -c "sk_live_" || true)
if [ "$COUNT" -gt 0 ]; then
  echo "ERROR: $COUNT occurrences of sk_live_ still found in history!"
  exit 1
fi
echo "✅ Zero sk_live_ occurrences remaining."

echo ""
echo "── Step 4: Set remote and push ──────────────────────────────────────────"
REMOTE_URL="https://${GITHUB_PAT}@${REPO_URL#https://}"
git remote set-url subrepl-25n71ba9 "$REMOTE_URL" 2>/dev/null || \
  git remote add subrepl-25n71ba9 "$REMOTE_URL"

git push subrepl-25n71ba9 main --force 2>&1 | sed "s/${GITHUB_PAT}/[REDACTED]/g"

echo ""
echo "✅ Done! Check https://github.com/janj2185-svg/LiveStorm-AI"
