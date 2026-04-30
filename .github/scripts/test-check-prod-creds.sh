#!/usr/bin/env bash
# test-check-prod-creds.sh
#
# Local test harness for check-prod-creds.sh. Confirms:
#   1. Current repo state passes (no false positives).
#   2. Synthetic env file containing PRODUCTION fails without [prod-creds].
#   3. Synthetic env file containing PRODUCTION passes with [prod-creds].
#   4. Synthetic spark26 PRODUCTION reference is ignored (spark26 has its
#      own gate; not double-counted here).
#
# Usage: ./.github/scripts/test-check-prod-creds.sh
#
# Runs from a temp directory clone so it doesn't pollute the working tree.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="${REPO_ROOT}/.github/scripts/check-prod-creds.sh"

PASS=0
FAIL=0

run_in_sandbox() {
  local name="$1"
  local title="$2"
  local expected_exit="$3"
  shift 3
  # Remaining args are pairs of: relative-path, contents.

  local sandbox
  sandbox="$(mktemp -d)"
  trap 'rm -rf "${sandbox}"' RETURN

  mkdir -p "${sandbox}/.github/scripts"
  cp "${SCRIPT}" "${sandbox}/.github/scripts/check-prod-creds.sh"
  chmod +x "${sandbox}/.github/scripts/check-prod-creds.sh"

  while [[ "$#" -gt 0 ]]; do
    local rel="$1"; shift
    local contents="$1"; shift
    mkdir -p "${sandbox}/$(dirname "${rel}")"
    printf '%s\n' "${contents}" > "${sandbox}/${rel}"
  done

  set +e
  ( cd "${sandbox}" && ./.github/scripts/check-prod-creds.sh "${title}" >/dev/null 2>&1 )
  local actual_exit=$?
  set -e

  if [[ "${actual_exit}" == "${expected_exit}" ]]; then
    echo "PASS  ${name} (exit ${actual_exit})"
    PASS=$((PASS + 1))
  else
    echo "FAIL  ${name} — expected ${expected_exit}, got ${actual_exit}"
    FAIL=$((FAIL + 1))
  fi

  rm -rf "${sandbox}"
  trap - RETURN
}

# Case 1: a non-spark26 app env file references PRODUCTION, no [prod-creds] -> fail.
run_in_sandbox "PRODUCTION ref without opt-in" \
  "feat: dashboard tweak" \
  1 \
  "apps/dashboard/.env.example" "REMITTANCE_ENVIRONMENT=PRODUCTION"

# Case 2: same env reference, but title has [prod-creds] -> pass.
run_in_sandbox "PRODUCTION ref with [prod-creds] opt-in" \
  "feat(remittance): [prod-creds] enable production" \
  0 \
  "apps/dashboard/.env.example" "REMITTANCE_ENVIRONMENT=PRODUCTION"

# Case 3: only spark26 references PRODUCTION -> pass (excluded by design).
run_in_sandbox "spark26 PRODUCTION ref ignored" \
  "fix: stuff" \
  0 \
  "apps/spark26/.env.example" "SOMETHING=PRODUCTION"

# Case 4: no PRODUCTION references anywhere -> pass.
run_in_sandbox "no PRODUCTION refs" \
  "feat: anything" \
  0 \
  "apps/dashboard/.env.example" "DATABASE_URL=postgres://localhost/dev"

# Case 5: directory has no env files at all -> pass.
run_in_sandbox "no env files" \
  "feat: empty repo" \
  0 \
  "apps/dashboard/package.json" "{}"

# Case 6: live repo state — current files must not false-positive.
set +e
( cd "${REPO_ROOT}" && ./.github/scripts/check-prod-creds.sh "feat: real-repo title" >/dev/null 2>&1 )
LIVE_EXIT=$?
set -e
if [[ "${LIVE_EXIT}" == 0 ]]; then
  echo "PASS  current repo state has no false positives"
  PASS=$((PASS + 1))
else
  echo "FAIL  current repo state false-positives (exit ${LIVE_EXIT})"
  FAIL=$((FAIL + 1))
fi

echo
echo "${PASS} passed, ${FAIL} failed"

if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
