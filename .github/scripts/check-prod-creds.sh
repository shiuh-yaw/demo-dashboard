#!/usr/bin/env bash
# check-prod-creds.sh
#
# Fails when env files under apps/* contain the literal token "PRODUCTION"
# AND the supplied PR title does not contain "[prod-creds]".
#
# Sandbox-by-default (D-005): production credentials in any non-prod-marked
# PR is a deliberate-opt-in event. Spark26 is excluded — it's already
# zero-touch and gated by its own workflow.
#
# Inputs:
#   $1 — PR title (may be empty for non-PR events; in that case we no-op)
#
# Behavior:
#   - greps `apps/<name>/.env*` style files for the token PRODUCTION.
#   - skips spark26 matches.
#   - if any remain AND title lacks [prod-creds], exits 1.
#   - otherwise, exits 0.
#
# Used by .github/workflows/ci.yml. Also runnable locally:
#
#   ./.github/scripts/check-prod-creds.sh "feat(remittance): [prod-creds] enable production"

set -uo pipefail

PR_TITLE="${1:-}"

# Glob across known env file conventions in this repo:
#   apps/<name>/.env*       (e.g. .env.example, .env.local.example)
#   apps/<name>/.example.env (alt convention used by some apps)
shopt -s nullglob
ENV_FILES=(apps/*/.env* apps/*/.example.env)
shopt -u nullglob

if [[ "${#ENV_FILES[@]}" -eq 0 ]]; then
  echo "No app env files found; nothing to check."
  exit 0
fi

# Case-sensitive grep for PRODUCTION; suppress stderr; -H forces filename
# in output even when only one file matches, so `grep -v 'spark26'` can
# reliably filter on path. Ignore spark26 entries — that app has its own gate.
MATCHES=$(grep -Hn "PRODUCTION" "${ENV_FILES[@]}" 2>/dev/null | grep -v '/spark26/' || true)

if [[ -z "${MATCHES}" ]]; then
  echo "No production-credential references in apps/*/env*; OK."
  exit 0
fi

if [[ "${PR_TITLE}" == *"[prod-creds]"* ]]; then
  echo "Production credentials referenced; PR title carries [prod-creds]; allowed."
  echo "${MATCHES}"
  exit 0
fi

echo "::error::Production credentials referenced in apps/* without [prod-creds] in PR title."
echo "${MATCHES}"
exit 1
