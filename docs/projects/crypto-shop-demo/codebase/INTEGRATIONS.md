# External Integrations

**Analysis Date:** 2026-03-31

## APIs & External Services

### Wallet Authentication & Multi-Chain Support

**Dynamic Labs SDK:**
- Service: Embedded wallet and authentication platform
- What it's used for: Wallet connection, embedded wallets, authentication, transaction signing
- SDK/Client: `@dynamic-labs-sdk/client` 0.12.1
- Additional Modules: 
  - `@dynamic-labs-sdk/evm` (EVM chains)
  - `@dynamic-labs-sdk/solana` (Solana)
  - `@dynamic-labs-sdk/zerodev` (ZeroDev account abstraction)
- Auth: `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` (public env var)
- Implementation: 
  - `src/lib/dynamic/dynamic-auth.ts` - API middleware for bearer token auth
  - `src/lib/dynamic/dynamic-jwt.ts` - JWT verification
  - `src/lib/auth/session.ts` - Cookie-based session management
- Docs: https://app.dynamic.xyz

### Cross-Chain Swaps & Bridge Integration

**LI.FI (Liquidity Finance):**
- Service: Cross-chain swap quotes and transaction status tracking
- What it's used for: Quote fetching (reverse quotes for fixed destination amount), transaction status polling
- SDK/Client: REST API
- Auth: `LIFI_API_KEY` (header: `x-lifi-api-key`)
- Implementation: `src/lib/services/lifi.ts`
- API Endpoints:
  - `https://li.quest/v1/quote/toAmount` - Get swap quotes
  - `https://li.quest/v1/status` - Poll transaction status
- Usage Pattern:
  - Fetches routes for cross-chain transfers
  - Returns route ID, amounts, gas costs, fees
  - Polls status to track PENDING → DONE transitions
  - Returns explorer links (LI.FI, bridge, source chain, destination chain)
- Error Handling: Returns NOT_FOUND for unknown transactions, PENDING on errors (for retry)
- Docs: https://docs.li.fi/

### Fiat Onramps

**Coinbase Onramp:**
- Service: Fiat-to-crypto onramp for USD purchases
- What it's used for: Payment checkout configuration, onramp flow initiation
- SDK/Client: `@coinbase/cdp-sdk` 1.38.6
- Auth: `COINBASE_API_KEY`, `COINBASE_API_SECRET` (API key pair); environment via `COINBASE_API_ENVIRONMENT` (default `sandbox`)
- Implementation: `src/lib/coinbase/client.ts`
- Configuration: `src/lib/coinbase/schemas.ts`, `src/lib/coinbase/types.ts`
- Usage: Dashboard creates onramp payment configurations stored in Redis
- Docs: https://www.coinbase.com/developer-platform

### Bank & Payment Rails

**BlindPay (PIX/ACH/SEPA):**
- Service: Stablecoin-to-fiat payouts and payins (PIX for Brazil, ACH for US, SEPA for EU)
- What it's used for: Bank withdrawals, deposit flows, cross-border remittance
- SDK/Client: REST API
- Auth: `BLINDPAY_INSTANCE_ID`, `BLINDPAY_API_KEY`
- Base URL: `BLINDPAY_API_URL` (defaults to `https://api.blindpay.com/v1`)
- Implementation: `src/lib/services/blindpay.ts`
- API Endpoints (via dashboard):
  - `POST /api/blindpay/payouts/quote` - Get payout quote (crypto → fiat)
  - `POST /api/blindpay/payouts/execute` - Execute payout
  - `GET /api/blindpay/payouts/[id]` - Check payout status
  - `POST /api/blindpay/payins/quote` - Get payin quote (fiat → crypto)
  - `POST /api/blindpay/payins/execute` - Execute payin
  - `GET /api/blindpay/payins/[id]` - Check payin status
  - `GET /api/blindpay/rates` - Get current exchange rates
- Supported Networks: base_sepolia, base, ethereum, arbitrum, polygon, stellar, tron
- Supported Currencies: USDC, USDT, USDB
- Supported Fiat: USD, BRL, MXN, COP, ARS
- Payment Methods: ach, wire, pix, sepa
- Docs: https://www.blindpay.com/docs/getting-started/overview

**Iron Finance:**
- Service: Financial operations and trading APIs
- What it's used for: Trade execution, order management, rate quotes
- SDK/Client: REST API
- Auth: `IRON_API_KEY`
- Environment: `IRON_ENVIRONMENT` (production or sandbox, defaults to production)
- Implementation: `src/lib/services/iron.ts` (48KB - large service with many operations)
- Environment Selector: `https://app.iron.xyz` (production) or `https://app.sandbox.iron.xyz` (sandbox)

### Blockchain Interaction

**Alchemy (RPC & Data):**
- Service: Blockchain RPC and enhanced data APIs
- What it's used for: EVM transaction execution, wallet queries, balance checks
- SDK/Client: Alchemy SDK via workspace package
- Implementation: `@dynamic-demos/alchemy` package
- Used in: Remittance, deposit, trade apps
- Purpose: Gas-sponsored transfers, wallet state queries

**Fireblocks (Custody & MPC Wallets):**
- Service: Multi-party computation custody solution
- What it's used for: Non-custodial wallet creation, private key management
- SDK/Client: `@fireblocks/ts-sdk` 6.0.0 (detected in node_modules)
- Implementation: `@dynamic-demos/fireblocks` workspace package
- Used in: Remittance, deposit, trade apps for embedded wallet custody
- Integration: Works alongside Dynamic SDK for wallet management

**Viem (Lightweight EVM Client):**
- Service: Ethereum client library
- What it's used for: Direct contract interaction, transaction creation
- SDK/Client: `viem` 2.42.1
- Used in: Remittance, deposit, trade apps

### Market Data & Analytics

**CoinGecko (Price & Market Data):**
- Service: Cryptocurrency price and market data
- What it's used for: Token price displays, market analytics
- Implementation: `@dynamic-demos/coingecko` workspace package
- Used in: Trade app for price displays and market info

**Polymarket (Prediction Markets):**
- Service: Prediction market data and order books
- What it's used for: Trading pairs and market data for trade app
- Implementation: `@dynamic-demos/polymarket` workspace package
- Used in: Trade app

## Data Storage

### Primary Storage: Redis

**Local Development (ioredis):**
- Client: `ioredis` 5.6.1
- Connection: `redis://localhost:6379` (configurable via `REDIS_URL`)
- Stores: Checkout configs, transactions, users, stats, branding configs
- Setup: `brew install redis && redis-server`

**Production (Upstash Redis):**
- Client: `@upstash/redis` 1.34.8 (REST API, serverless)
- Connection: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Unified Interface: `src/lib/redis.ts` wraps both implementations
- Auto-selects: Upstash if configured, otherwise falls back to local Redis

**Key Prefixes & Structure:**
- Checkout Configs: `payment-widget:config:{id}` (shared with nextjs-payment-widget)
- Transactions: `checkout:tx:{id}`, `checkout:{checkoutId}:txs` (set of IDs)
- Users: `checkout:user:{id}`, `checkout:user:addr:{address}` (index)
- Pending Transactions: `checkout:tx:pending` (set of transaction IDs for reconciliation)
- Stats: `checkout:{checkoutId}:stats` (cached aggregates)
- Branding Configs: Dashboard, earn, wallet, remittance, trade configs plus brand profiles
- External ID Index: `checkout:{checkoutId}:ext:{externalId}` (unique per checkout)

**Service Layer:**
- Abstraction: `src/lib/services/types.ts` defines interfaces
- Implementations: `src/lib/services/redis/` (Redis-specific)
- Benefit: Can swap Prisma or other backends without changing API code

### No Traditional Database

- Primary storage: Redis only
- No SQL database in use
- No Prisma ORM
- All persistence via Redis key-value store and sets

## Authentication & Identity

### Cookie-Based Session (Dashboard UI)

**Flow:**
1. Email + OTP via Dynamic SDK
2. JWT generated and stored in httpOnly cookie
3. Verified on API requests via `withAuth` middleware

**Implementation:**
- `src/lib/auth/session.ts` - Cookie session management
- Middleware: `src/lib/dynamic/dynamic-auth.ts` - `withAuth()` wrapper for protected routes

**Key Files:**
- `src/lib/auth/dynamic-jwt.ts` - JWT verification logic
- `src/app/api/checkouts/[id]/route.ts` - Example protected endpoint

### Bearer Token Auth (External APIs)

**Flow:**
1. Client sends `Authorization: Bearer <jwt>` header
2. JWT verified via Dynamic JWKS endpoint
3. Claims extracted for authorization

**Implementation:**
- Dynamic JWT verification
- JWKS-based validation: `jwks-rsa` 3.2.0
- Used for: External/programmatic API access

**Public Endpoints (No Auth Required):**
- `GET /api/checkouts/[id]` - Get checkout config
- `POST /api/checkouts/[id]/transactions` - Create transaction (externalId-based)
- `GET /api/checkouts/[id]/transactions/[txId]/status` - Check transaction status

## Background Job Processing

**Upstash QStash:**
- Service: Serverless job queue with retries and scheduling
- What it's used for: Reliable transaction status polling from LI.FI
- SDK/Client: `@upstash/qstash` 2.8.4
- Configuration:
  - Token: `QSTASH_TOKEN`
  - Signing Keys: `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` (for webhook verification)
  - Base URL: `APP_URL` (for QStash to callback)
- Implementation: `src/lib/upstash/qstash.ts`
- Job Details:
  - Endpoint: `/api/internal/worker`
  - Payload: `{ transactionId, txHash, retryCount }`
  - Backoff delays: [5s, 10s, 30s, 1m, 2m, 5m]
  - Max retries: 50
  - QStash internal retries: 3 per delivery attempt
- Signature Verification: `verifyQStashSignature()` validates incoming webhooks
- Job Enqueueing: `enqueueTransactionMonitor()` schedules status polls

## Scheduled Tasks & Cron

**Vercel Cron:**
- Endpoint: `src/app/api/cron/reconcile`
- Purpose: Mark stale transactions, re-enqueue stuck pending transactions
- Authentication: `CRON_SECRET` environment variable
- Trigger: Vercel cron schedule (time TBD in deployment config)

## CORS & Cross-Origin

**Configuration:**
- Next.js headers: `src/app/next.config.ts`
- Applies to: `/api/:path*` routes
- Headers:
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Origin: *`
  - Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
  - Custom headers: `x-dynamic-environment-id`, `X-CSRF-Token`, etc.

## API Response Standardization

**Response Format:**
- File: `src/lib/api-response.ts`
- Utility functions: `createResponse()`, `handleApiError()`
- Error handling: Consistent error structure with status codes

## Webhooks & Callbacks

### Incoming Webhooks

**QStash Webhooks:**
- Endpoint: `POST /api/internal/worker`
- Source: Upstash QStash job queue
- Payload: Transaction monitoring job with txHash and retryCount
- Verification: HMAC signature validation via `verifyQStashSignature()`

### Outgoing Webhooks

**Not Detected:** Codebase appears to only consume webhooks, not emit them.

## Environment Configuration

**Required Environment Variables:**
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - Dynamic Labs project ID
- `COINBASE_API_KEY` / `COINBASE_API_SECRET` - Coinbase Onramp credentials (sandbox by default via `COINBASE_API_ENVIRONMENT`)
- `LIFI_API_KEY` - LI.FI cross-chain swap API key

**Recommended (for production):**
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - Production Redis
- `QSTASH_TOKEN` / `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` - Background jobs
- `APP_URL` - Base URL for QStash callbacks
- `BLINDPAY_INSTANCE_ID` / `BLINDPAY_API_KEY` - BlindPay bank/PIX operations
- `IRON_API_KEY` - Iron Finance operations
- `CRON_SECRET` - Vercel cron authentication
- `ANTHROPIC_API_KEY` - Optional: AI theme extraction

**Local Development Only:**
- `REDIS_URL` - Defaults to `redis://localhost:6379`

**See:** `.example.env` for complete reference with descriptions

---

*Integration audit: 2026-03-31*
