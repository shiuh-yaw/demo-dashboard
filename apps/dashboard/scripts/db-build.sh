#!/usr/bin/env bash
#
# Dashboard build entrypoint. Applies Prisma migrations on production and
# preview, seeds only ephemeral preview branch databases, then builds.
#
# On a Vercel preview, the Supabase branch integration injects POSTGRES_*
# connection vars - map them so Prisma (migrate + seed) targets the per-PR
# branch database. Production keeps its own DATABASE_URL/DIRECT_URL and is
# never seeded.
#
# The branch URL WINS over DATABASE_URL here. The other way round, a
# DATABASE_URL that reached Preview scope silently pointed `migrate deploy`
# and the seed at production - which is how production got seeded.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "preview" ]; then
  export DATABASE_URL="${POSTGRES_PRISMA_URL:-${DATABASE_URL:-}}"
  export DIRECT_URL="${POSTGRES_URL_NON_POOLING:-${DIRECT_URL:-}}"
fi

if [ "${VERCEL_ENV:-}" = "production" ] || [ "${VERCEL_ENV:-}" = "preview" ]; then
  pnpm --filter @dynamic-demos/db prisma:migrate:deploy
fi

# Seeding is best-effort: a hiccup leaves the branch schema in place (empty
# data) rather than blocking the preview deploy entirely.
if [ "${VERCEL_ENV:-}" = "preview" ]; then
  pnpm --filter @dynamic-demos/db prisma:seed || echo "seed failed (non-fatal), continuing build"
fi

next build
