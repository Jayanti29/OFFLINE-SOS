#!/usr/bin/env bash
set -e

echo "🚀 SafeRoute Contribution Generator"
echo "Targeting 350 atomic commits for today's GitHub contribution graph..."

COMMIT_COUNT=350
LOG_FILE="COMMIT_ACTIVITY_LOG.md"

if [ ! -d ".git" ]; then
  echo "❌ Error: Not inside a git repository."
  exit 1
fi

echo "# SafeRoute Development Telemetry Log" > "$LOG_FILE"

for i in $(seq 1 $COMMIT_COUNT); do
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
  echo "Commit #$i - Telemetry pulse recorded at $TIMESTAMP" >> "$LOG_FILE"
  git add "$LOG_FILE"
  git commit -m "chore(telemetry): record safe route telemetry update #$i" --quiet
  if (( i % 50 == 0 )); then
    echo "  [✓] $i / $COMMIT_COUNT commits created locally..."
  fi
done

echo "✅ Created $COMMIT_COUNT local commits! Pushing to GitHub now..."

CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
  CURRENT_BRANCH="main"
fi

git push origin "$CURRENT_BRANCH"

echo "🎉 DONE! All 350 commits are pushed to GitHub. Check your profile!"
