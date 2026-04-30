#!/usr/bin/env bash
# test-check-spark26-protection.sh
#
# Local test harness for check-spark26-protection.sh. Exercises the four
# combinations (spark26-touched x [spark26]-titled) and confirms each
# returns the expected exit code.
#
# Usage: ./.github/scripts/test-check-spark26-protection.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="${SCRIPT_DIR}/check-spark26-protection.sh"

PASS=0
FAIL=0

run_case() {
  local name="$1"
  local changed="$2"
  local title="$3"
  local expected_exit="$4"

  set +e
  "${CHECK}" "${changed}" "${title}" >/dev/null 2>&1
  local actual_exit=$?
  set -e

  if [[ "${actual_exit}" == "${expected_exit}" ]]; then
    echo "PASS  ${name} (exit ${actual_exit})"
    PASS=$((PASS + 1))
  else
    echo "FAIL  ${name} — expected exit ${expected_exit}, got ${actual_exit}"
    FAIL=$((FAIL + 1))
  fi
}

# Case 1: spark26 files changed, no [spark26] in title -> must fail (exit 1).
run_case "spark26 changes without opt-in token" \
  "apps/spark26/README.md
packages/theme/src/index.ts" \
  "chore: nudge spark26" \
  1

# Case 2: spark26 files changed WITH [spark26] in title -> must pass (exit 0).
run_case "spark26 changes with opt-in token" \
  "apps/spark26/src/page.tsx" \
  "fix(spark26): [spark26] correct payment hook" \
  0

# Case 3: no spark26 files changed -> must pass regardless of title.
run_case "no spark26 changes" \
  "apps/dashboard/src/page.tsx
packages/ui/src/Button.tsx" \
  "feat: add new dashboard widget" \
  0

# Case 4: no spark26 files changed and title happens to contain [spark26] -> still pass.
run_case "no spark26 changes but title contains token" \
  "packages/theme/src/defaults.css" \
  "chore: [spark26] follow-up theme tweak" \
  0

# Case 5: a path that merely contains 'spark26' but is not under apps/spark26/ -> pass.
run_case "non-spark26 path containing spark26 in name" \
  "docs/spark26-notes.md" \
  "docs: add spark26 notes" \
  0

echo
echo "${PASS} passed, ${FAIL} failed"

if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
