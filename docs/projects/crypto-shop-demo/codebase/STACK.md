# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code and configuration
- JavaScript - Build and configuration files

**Supporting:**
- CSS/Tailwind - Styling and theme system

## Runtime

**Environment:**
- Node.js - Target runtime (version specified in Next.js)
- Vercel - Production deployment platform with Edge/Serverless support

**Package Manager:**
- pnpm 9.15.4 - Monorepo package management
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks & Core

**Web Framework:**
- Next.js 15.5.9 - Full-stack React framework with App Router
- React 19.1.4 - UI library
- React DOM 19.1.4 - DOM rendering

**Styling:**
- Tailwind CSS 4.1.17 - Utility-first CSS framework
- PostCSS 4.1.17 - CSS transformation (via @tailwindcss/postcss)
- next-themes 0.4.6 - Theme management for light/dark mode
- clsx 2.1.1 - Conditional CSS class composition
- tailwind-merge 3.3.0 - Tailwind class merging utility
- tw-animate-css 1.4.0 - Animation utilities

**Component Libraries:**
- lucide-react 0.511.0 (dashboard), 0.541.0 (other apps) - Icon library
- @dynamic-labs/iconic 4.61.1 (trade app) - Dynamic-specific icon set

## Build & Development Tools

**Build System:**
- Turbo 2.8.0 - Monorepo build orchestration
- TypeScript Compiler (tsc) - Type checking
- Next.js built-in bundler/webpack - Module bundling

**Linting & Formatting:**
- ESLint 9.39.1 - Code linting
- ESLint config for Next.js 15.5.4 - Next.js linting rules
- @eslint/eslintrc 3.3.1 - ESLint configuration utilities
- No Prettier detected - using ESLint for both linting and formatting

**Configuration:**
- `tsconfig.json` - TypeScript configuration (per app)
- `eslint.config.mjs` - ESLint configuration (per app)
- `postcss.config.mjs` - PostCSS configuration
- `next.config.ts` - Next.js configuration with CORS headers and image optimization

## Key Dependencies

### Authentication & Security

**JWT & Token Management:**
- jsonwebtoken 9.0.2 - JWT creation and verification
- @types/jsonwebtoken 9.0.10 - TypeScript types for jsonwebtoken
- jwks-rsa 3.2.0 - JWKS (JSON Web Key Set) validation for external JWT verification
- @dynamic-demos/dynamic (workspace) - Internal authentication utilities

**Authentication Providers:**
- @dynamic-labs-sdk/client 0.12.1 - Dynamic Labs wallet SDK (core)
- @dynamic-labs-sdk/evm 0.12.1 - Dynamic Labs EVM chain support (most apps)
- @dynamic-labs-sdk/solana 0.12.1 - Dynamic Labs Solana chain support (trade app)
- @dynamic-labs-sdk/zerodev 0.12.1 - Dynamic Labs ZeroDev integration (remittance app)

### Financial & Blockchain APIs

**Cross-Chain Swaps:**
- LI.FI API - Quote and status tracking for cross-chain swaps
  - `src/lib/services/lifi.ts` - Service abstraction layer
  - Requires: `LIFI_API_KEY` environment variable
  - Uses: LI.FI REST API at `https://li.quest/v1`

**Fiat Onramps:**
- @coinbase/cdp-sdk 1.38.6 - Coinbase onramp integration
  - `src/lib/coinbase/` - Service implementation
  - Requires: `COINBASE_API_KEY`, `COINBASE_API_SECRET` (sandbox by default via `COINBASE_API_ENVIRONMENT`)
  - Handles onramp configuration and payment processing

**Bank & Payment Processing:**
- BlindPay API - PIX/bank withdrawals and payins
  - `src/lib/services/blindpay.ts` - Service abstraction
  - Requires: `BLINDPAY_INSTANCE_ID`, `BLINDPAY_API_KEY`, `BLINDPAY_API_URL`
  - Handles payouts to bank accounts and payins via ACH/SEPA/PIX

**Iron Finance API:**
- `src/lib/services/iron.ts` - Iron Finance service layer
- Requires: `IRON_API_KEY`, `IRON_ENVIRONMENT` (production/sandbox)
- Handles financial operations for trade/remittance flows

**Blockchain Interaction:**
- viem 2.42.1 - Lightweight Ethereum/EVM client (remittance, deposit, trade)
- Fireblocks integration via workspace package `@dynamic-demos/fireblocks` - Custody solution for embedded wallets

**Blockchain Data & Queries:**
- Alchemy SDK via workspace package `@dynamic-demos/alchemy` - RPC and data queries
- CoinGecko integration via workspace package `@dynamic-demos/coingecko` - Price and market data

**Markets & Trading:**
- Polymarket integration via workspace package `@dynamic-demos/polymarket` - Prediction market data

### Data Storage & Caching

**Redis (Dual Mode):**
- ioredis 5.6.1 - Local Redis client for development
  - Connects to: `redis://localhost:6379` (configurable via `REDIS_URL`)
  - Used for checkout configs, transactions, users, stats
- @upstash/redis 1.34.8 - Upstash Redis REST client for production
  - Requires: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Implementation: `src/lib/redis.ts` (unified wrapper)
  - Key prefixes defined: `REDIS_KEYS` object for all data structures

**Service Layer Abstraction:**
- `src/lib/services/types.ts` - Interface definitions
- `src/lib/services/redis/` - Redis implementations
- Supports swapping storage backends (Redis or Prisma) without code changes

### Background Job Processing

**QStash (Upstash):**
- @upstash/qstash 2.8.4 - Reliable serverless job queue
  - Requires: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
  - Worker endpoint: `src/app/api/internal/worker`
  - Used for: Transaction status polling with exponential backoff
  - Backoff delays: [5s, 10s, 30s, 1m, 2m, 5m]
  - Max retries: 50

### AI & Content Analysis

**Anthropic Claude API:**
- @anthropic-ai/sdk 0.71.2 - Claude SDK for AI features
- Requires: `ANTHROPIC_API_KEY` (optional)
- Used for: Theme extraction from URLs in dashboard

### Data Validation & Type Safety

**Runtime Validation:**
- zod 3.25.76 - Schema validation and type inference
- @t3-oss/env-nextjs 0.13.8 - Environment variable validation with Zod
- Implementation: `src/env.ts` - Centralized env validation
- Schema files: `src/lib/validation/schemas/`

### UI & Interaction

**State Management:**
- @tanstack/react-query 5.90.16 - Server state management (remittance, deposit, trade apps)
- next-themes 0.4.6 - Theme provider and switching

**Data Visualization:**
- lightweight-charts 4.2.0 (trade app) - Financial charting library
- qrcode.react 4.2.0 (remittance app) - QR code generation

**Utilities:**
- @paralleldrive/cuid2 2.2.2 - Collision-resistant unique IDs
- pino-pretty 13.1.2 - Pretty-printed logging

## Monorepo Structure

**Root Package Manager Config:**
- `package.json` - Root workspace with turbo scripts
- `pnpm.overrides` - Dependency resolution for `ufo@1.6.2`

**Apps (Turborepo workspaces):**
- `@dynamic-demos/dashboard` - Main admin dashboard (port 4000)
- `@dynamic-demos/checkouts` - Checkout integration demo (port 3000)
- `@dynamic-demos/earn` - Earnings feature demo (port 3000)
- `@dynamic-demos/wallet` - Wallet demo (port 3000)
- `@dynamic-demos/remittance` - Cross-border payment demo (port 4004)
- `@dynamic-demos/deposit` - Deposit flow demo (port 4006)
- `@dynamic-demos/trade` - Crypto trading demo (port 4005)

**Shared Packages:**
- `@dynamic-demos/dynamic` - Auth and Dynamic SDK utilities
- `@dynamic-demos/ui` - Shared UI components
- `@dynamic-demos/theme` - Theme system and tokens
- `@dynamic-demos/types` - Shared type definitions
- `@dynamic-demos/utils` - Utility functions
- `@dynamic-demos/tsconfig` - Shared TypeScript configurations
- `@dynamic-demos/fireblocks` - Fireblocks custody wrapper
- `@dynamic-demos/alchemy` - Alchemy RPC wrapper
- `@dynamic-demos/coingecko` - CoinGecko price data wrapper
- `@dynamic-demos/polymarket` - Polymarket integration wrapper

## Configuration Files

**Environment:**
- `.example.env` - Template with all required/optional variables
- `.env` - Local overrides (git-ignored)
- Environment validation: `src/env.ts` with Zod schemas

**Build & Dev:**
- `tsconfig.json` - TypeScript compilation target, module, lib settings
- `next.config.ts` - Next.js configuration with CORS headers and image optimization
- `eslint.config.mjs` - ESLint rules (flat config format)
- `postcss.config.mjs` - PostCSS plugins (Tailwind)

**Production & Deployment:**
- `.vercel/` - Vercel deployment configuration
- Vercel Cron Jobs - `src/app/api/cron/reconcile` for stale transaction cleanup
- Next.js Edge capabilities - Used by QStash and API routes

## Platform & Infrastructure Requirements

**Development:**
- macOS/Linux/Windows capable of running Node.js
- Redis server (local): `brew install redis && redis-server`
- pnpm for dependency management
- Port 4000 (dashboard), 3000-4006 (other apps) available

**Production:**
- Vercel (primary deployment)
- Upstash Redis (REST API-based, serverless)
- Upstash QStash (serverless job queue)
- Dynamic Labs environment
- External API credentials (Coinbase, LI.FI, BlindPay, Iron, Anthropic)

## Build Output

**Next.js Optimization:**
- `.next/` directory - Build output (git-ignored)
- Static generation where possible
- API Routes as serverless functions
- Automatic code splitting per Next.js App Router

---

*Stack analysis: 2026-03-31*
