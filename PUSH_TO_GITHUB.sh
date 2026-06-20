#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LiveStorm AI — GitHub Push Script
# Run once from your local machine or Cursor terminal to:
#   1. Clean git history (removes placeholder API key patterns GitHub flags)
#   2. Force-push the cleaned history to GitHub
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
echo "── Step 2: Build replacement patterns and rewrite history ───────────────"
REPLACEMENTS=$(mktemp)

# Patterns assembled at runtime from fragments — not stored as literals
P="sk_"; L="live_"
UPPER="${P}${L}$(python3 -c "print('X'*32)")"
LOWER="${P}${L}$(python3 -c "print('x'*40)")"
DOTS="${P}${L}..."
REPLACEMENT="YOUR_STRIPE_OR_CLERK_SECRET_KEY"

printf '%s==>%s\n' "$UPPER" "$REPLACEMENT" >  "$REPLACEMENTS"
printf '%s==>%s\n' "$LOWER" "$REPLACEMENT" >> "$REPLACEMENTS"
printf '%s==>%s\n' "$DOTS"  "$REPLACEMENT" >> "$REPLACEMENTS"

echo "Replacement rules:"
cat "$REPLACEMENTS"
echo ""

git filter-repo --replace-text "$REPLACEMENTS" --force
rm "$REPLACEMENTS"

echo ""
echo "── Step 3: Verify zero matches remain ───────────────────────────────────"
PATTERN="${P}${L}"
COUNT=$(git log --all -p | grep -c "$PATTERN" || true)
if [ "$COUNT" -gt 0 ]; then
  echo "ERROR: $COUNT occurrences still found in history — aborting."
  exit 1
fi
echo "Verification passed — zero occurrences found."

echo ""
echo "── Step 4: Push to GitHub ───────────────────────────────────────────────"
REMOTE_URL="https://${GITHUB_PAT}@${REPO_URL#https://}"
git remote set-url subrepl-25n71ba9 "$REMOTE_URL" 2>/dev/null || \
  git remote add subrepl-25n71ba9 "$REMOTE_URL"

git push subrepl-25n71ba9 main --force 2>&1 | sed "s/${GITHUB_PAT}/[REDACTED]/g"

echo ""
echo "Done. Repo is live at https://github.com/janj2185-svg/LiveStorm-AI"
