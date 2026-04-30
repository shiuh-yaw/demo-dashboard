#!/usr/bin/env bash
# check-spark26-protection.sh
#
# Fails if any file under apps/spark26/ is in the changed-files list
# AND the supplied PR title does not contain the literal token "[spark26]".
#
# Inputs:
#   $1 — newline-separated list of changed files (typically `git diff --name-only`)
#   $2 — PR title
#
# Exits 0 when:
#   - no apps/spark26/ files changed, OR
#   - apps/spark26/ files changed AND PR title contains "[spark26]"
#
# Exits 1 when apps/spark26/ files changed AND title does NOT contain "[spark26]".
#
# Used by .github/workflows/spark26-protection.yml. Also runnable locally:
#
#   ./.github/scripts/check-spark26-protection.sh \
#     "$(git diff --name-only origin/main...HEAD)" \
#     "feat(spark26): tweak something"

set -euo pipefail

CHANGED_FILES="${1:-}"
PR_TITLE="${2:-}"

if [[ -z "${CHANGED_FILES}" ]]; then
  echo "No changed files provided; nothing to check."
  exit 0
fi

if echo "${CHANGED_FILES}" | grep -q "^apps/spark26/"; then
  if [[ "${PR_TITLE}" != *"[spark26]"* ]]; then
    echo "::error::PRs modifying apps/spark26/ require [spark26] in PR title (deliberate opt-in for prod app)."
    echo "Files changed under apps/spark26/:"
    echo "${CHANGED_FILES}" | grep "^apps/spark26/" || true
    exit 1
  fi
  echo "apps/spark26/ changes accompanied by [spark26] in PR title; allowed."
  exit 0
fi

echo "No apps/spark26/ files modified; nothing to enforce."
exit 0
