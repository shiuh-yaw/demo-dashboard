# Exchange demo on Railway (or any Docker host).
#
# Build context is the REPO ROOT (pnpm workspace); this file lives in
# apps/exchange. Railway: set the service's config file to
# apps/exchange/railway.json, or the variable RAILWAY_DOCKERFILE_PATH to
# apps/exchange/Dockerfile.
#
# Installs from public npm without a JFrog token by rewriting the lockfile's
# mirror URLs in the image only (same recipe as apps/exchange/README.md).
#
# NEXT_PUBLIC_* values are inlined at `next build`, so they must be present
# as build args. Railway passes service variables into the build automatically.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 CI=1
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /repo

# ---- install -------------------------------------------------------------
FROM base AS deps
COPY . .
# Public npm instead of the Fireblocks mirror: replace the workspace .npmrc
# and rewrite the lockfile's mirror URLs / mirror checksums for @dynamic-labs*.
RUN printf 'registry=https://registry.npmjs.org/\nengine-strict=true\nstrict-peer-dependencies=false\nauto-install-peers=true\n' > .npmrc \
 && sed -i -E 's#https://fbinfra555artifactory.jfrog.io/artifactory/api/npm/dynamic-npm/#https://registry.npmjs.org/#g; s#(https://registry\.npmjs\.org/(@[^/]+)/([^/]+)/-/)@[^/]+/#\1#g' pnpm-lock.yaml \
 && perl -0pi -e 's/resolution: \{integrity: [^,}]+, (tarball: https:\/\/registry\.npmjs\.org\/\@dynamic-labs[^}]+\})/resolution: {$1/g' pnpm-lock.yaml \
 && pnpm install --frozen-lockfile

# ---- build ---------------------------------------------------------------
FROM deps AS build
ARG NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
ARG NEXT_PUBLIC_EXCHANGE_MODE
ARG NEXT_PUBLIC_SEPOLIA_RPC_URL
ARG NEXT_PUBLIC_TRACK_URL
ENV NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=$NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID \
    NEXT_PUBLIC_EXCHANGE_MODE=$NEXT_PUBLIC_EXCHANGE_MODE \
    NEXT_PUBLIC_SEPOLIA_RPC_URL=$NEXT_PUBLIC_SEPOLIA_RPC_URL \
    NEXT_PUBLIC_TRACK_URL=$NEXT_PUBLIC_TRACK_URL
RUN pnpm turbo run build --filter=@dynamic-demos/exchange

# ---- run -----------------------------------------------------------------
FROM build AS run
ENV NODE_ENV=production
WORKDIR /repo/apps/exchange
EXPOSE 3000
# `next start` honours $PORT, which Railway injects.
CMD ["node_modules/.bin/next", "start"]
