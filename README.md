# Dynamic Demos

A Turborepo monorepo for managing checkout configurations, tracking transactions, and building payment experiences. The **dashboard** app provides a protected admin UI and API for creating/managing payment checkouts; **checkouts** is the embeddable widget; **earn** and **wallet** are additional demo apps.

## Monorepo Structure

```
apps/
├── dashboard/     # Admin UI + API (port 4000) - checkout config, transactions, Iron, Coinbase, LI.FI
├── checkouts/     # Embeddable checkout widget (port 4001)
├── earn/          # Earn demo app (port 4002)
└── wallet/        # Wallet demo with embedded wallets (port 4003)

packages/
├── ui/            # Shared UI components
├── theme/         # Shared theme/tokens
├── types/         # Shared TypeScript types
├── utils/         # Shared utilities
└── tsconfig/      # Shared TypeScript config
```

## Features

- **Checkout Management** - Create and configure payment/deposit checkouts with custom themes
- **Transaction Tracking** - Real-time transaction lifecycle monitoring from initialization to completion
- **User Management** - Track users and their connected wallets per checkout
- **Dynamic Authentication** - Email + OTP authentication via Dynamic SDK
- **Service Layer Architecture** - Abstracted data layer (Redis) ready for future migrations
  - Uses `ioredis` for local development and `@upstash/redis` for production
- **Background Job Processing** - QStash-powered reliable transaction status polling
- **Iron Finance API** - Enterprise-grade stablecoin payment infrastructure with KYC, customer management, and third-party payments
- **Coinbase Onramp API** - Runtime API for fiat-to-crypto demos
- **LI.FI Quote API** - Single-step quote endpoint for cross-chain swaps and bridges
- **AI Theme Extraction** - Import branding from any URL using Claude

## Technology Stack

- **Next.js** 15.5.9 - React framework with App Router
- **React** 19.1.4 - UI library
- **TypeScript** 5.9.3 - Type safety
- **Tailwind CSS** 4.1.17 - Styling with CSS-in-JS
- **Turborepo** - Monorepo build system
- **Dynamic SDK** - Wallet authentication
- **Upstash Redis/QStash** - Data storage and background jobs
- **Anthropic Claude** - AI theme extraction
- **Zod** - Runtime validation

## Getting Started

### Prerequisites

- **Node.js** 20+ (recommended: Node.js 20.19+)
- **pnpm** - Package manager
- **Redis** (for local development) - `brew install redis && redis-server`
- **Dynamic account** with Environment ID

### Installation

```bash
pnpm install
```

**Note**: All dependency versions are pinned for reproducibility. The `pnpm-lock.yaml` file ensures consistent installs across environments.

### Environment Setup

Copy `.example.env` to `.env` at the repo root. Individual apps may have their own `.example.env` (e.g. `apps/dashboard/.example.env`, `apps/earn/.example.env`).

```bash
cp .example.env .env
```

See `.example.env` for all available configuration options.

**Required variables:**

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - Dynamic Labs environment
- `COINBASE_API_KEY` / `COINBASE_API_SECRET` - Coinbase API
- `LIFI_API_KEY` - LI.FI API for swaps

**Optional for full features:**

- `IRON_ENVIRONMENT` / `IRON_API_KEY` - Iron Finance payment infrastructure (sandbox or production)
- `QSTASH_TOKEN` / `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` - Background jobs (QStash)
- `ANTHROPIC_API_KEY` - AI theme extraction (Claude API)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - Production Redis (Upstash)
- `APP_URL` - Base URL for QStash callbacks (required in production)
- `CRON_SECRET` - Secret for authenticating Vercel cron jobs

### Development

Run all apps:

```bash
pnpm dev
```

Run a single app:

```bash
pnpm dev:dashboard   # Dashboard + API on http://localhost:4000
pnpm dev:checkouts   # Checkout widget on http://localhost:4001
pnpm dev:earn        # Earn app on http://localhost:4002
pnpm dev:wallet      # Wallet app on http://localhost:4003
```

- **Dashboard**: [http://localhost:4000](http://localhost:4000)
- **API Health Check**: [http://localhost:4000/api](http://localhost:4000/api)

## Architecture

### Transaction Lifecycle

```
┌──────────────┐     ┌─────────┐     ┌───────────┐     ┌─────────┐     ┌───────────┐
│ initialized  │ ──▶ │  draft  │ ──▶ │ submitted │ ──▶ │ pending │ ──▶ │ confirmed │
└──────────────┘     └─────────┘     └───────────┘     └─────────┘     └───────────┘
       │                  │                                  │               │
       ▼                  ▼                                  ▼               ▼
  ┌─────────┐       ┌───────────┐                      ┌──────────┐    ┌──────────┐
  │ expired │       │ abandoned │                      │  failed  │    │ cancelled│
  └─────────┘       └───────────┘                      └──────────┘    └──────────┘
```

- **initialized** → User opened checkout, no route selected yet
- **draft** → Route selected, quote fetched
- **submitted** → Transaction submitted to blockchain (has txHash)
- **pending** → Awaiting confirmation (QStash polls for status)
- **confirmed** → Transaction successful
- **failed** → Transaction failed
- **cancelled** → Transaction cancelled by user or system
- **expired** → Initialized but never completed (24h timeout)
- **abandoned** → Draft but never submitted (1h timeout)

### Background Processing

- **QStash Worker** (`/api/internal/worker`) - Polls LI.FI for transaction status with exponential backoff
- **Cron Reconciliation** (`/api/cron/reconcile`) - Marks stale transactions, re-enqueues stuck pending transactions

## Project Structure (Dashboard App)

The dashboard app (`apps/dashboard/`) contains the admin UI and API:

```
apps/dashboard/
└── src/
    ├── app/
    │   ├── layout.tsx                    # Root layout with auth & sidebar
    │   ├── page.tsx                      # Home (redirects to checkouts)
    │   │
    │   ├── checkouts/                    # Checkout management UI
    │   │   ├── page.tsx                  # Checkouts list
    │   │   ├── new/page.tsx              # Create new checkout
    │   │   └── [id]/
    │   │       ├── layout.tsx            # Tabbed layout with header
    │   │       ├── page.tsx              # Overview tab
    │   │       ├── transactions/page.tsx # Transactions tab
    │   │       ├── users/page.tsx        # Users tab
    │   │       └── settings/page.tsx     # Settings tab (config editor)
    │   │
    │   ├── api/
    │   │   ├── route.ts                  # Health check
    │   │   ├── checkouts/                # Checkout & Transaction API
    │   │   ├── coinbase/onramp/          # Coinbase onramp API
    │   │   ├── widgets/[id]/             # Legacy widget config (deprecated)
    │   │   ├── cron/reconcile/           # Vercel cron job
    │   │   └── internal/worker/          # QStash callback endpoint
    │   │
    │   ├── documentation/               # API docs (onramp, checkouts, iron, blindpay)
    │   ├── brands/                       # Brand management
    │   ├── earns/                        # Earn config management
    │   └── wallets/                      # Wallet config management
    │
    ├── lib/
    │   ├── services/                     # Service layer (abstraction)
    │   ├── upstash/                      # QStash client
    │   ├── validation/                   # Zod schemas
    │   ├── actions/                      # Server actions
    │   ├── auth/                         # Authentication
    │   └── dynamic/                      # API auth middleware
    │
    └── components/                       # UI components
```

See [apps/dashboard/README.md](apps/dashboard/README.md) for dashboard-specific documentation.

## Authentication

The dashboard uses two authentication patterns:

1. **Cookie-based (Dashboard UI)** - Email + OTP login flow stores JWT in httpOnly cookie

2. **Bearer Token (External API)** - Apps call APIs with `Authorization: Bearer <jwt>` header

### Public Endpoints (No Authentication Required)

The following endpoints are public and do not require authentication:
- `GET /api/checkouts/[id]` - Get checkout configuration
- `POST /api/checkouts/[id]/transactions` - Initialize a transaction
- `GET /api/checkouts/[id]/transactions/[txId]/status` - Get transaction status

All other endpoints require authentication via Bearer token.

## API Reference

### Checkouts API

| Method | Endpoint | Description | Auth | Use Case |
|--------|----------|-------------|------|----------|
| GET | `/api/checkouts/[id]` | **Get checkout configuration** - Fetch the checkout settings including theme, supported tokens, and deposit address. Used by the widget to render the checkout UI. | Public | Widget initialization |
| GET | `/api/checkouts/[id]/transactions` | **List all transactions** - Retrieve paginated transaction history with optional filters (status, user). Returns transaction summaries with amounts, tokens, and current status. | Required | Dashboard transaction list |
| POST | `/api/checkouts/[id]/transactions` | **Initialize a new transaction** - Create a transaction record when a user opens the checkout widget. Records user info and returns a transaction ID for tracking. | Public | User opens widget |
| GET | `/api/checkouts/[id]/transactions/[txId]` | **Get transaction details** - Fetch complete transaction data including route information, amounts, fees, and lifecycle events. | Required | Transaction detail view |
| PATCH | `/api/checkouts/[id]/transactions/[txId]` | **Update transaction metadata** - Add or update route data after the user selects a payment method and gets a quote. Updates transaction to "draft" status. | Required | User selects payment route |
| POST | `/api/checkouts/[id]/transactions/[txId]/quote` | **Get cross-chain quote** - Request a quote from LI.FI for converting source token to destination token. Returns exact amounts, fees, estimated time, and route steps. | Required | User wants price estimate |
| POST | `/api/checkouts/[id]/transactions/[txId]/submit` | **Submit blockchain transaction** - Record the on-chain transaction hash after user confirms. Triggers background polling to monitor transaction status. Updates to "submitted" status. | Required | User confirms wallet transaction |
| GET | `/api/checkouts/[id]/transactions/[txId]/status` | **Get transaction status** - Check the current transaction status and progress. Returns lifecycle state (initialized, submitted, pending, confirmed, etc.). | Public | Widget status polling |
| PATCH | `/api/checkouts/[id]/transactions/[txId]/status` | **Update transaction status** - Manually update the transaction status. Used by background workers after polling blockchain or for manual reconciliation. | Required | Background worker updates |
| GET | `/api/checkouts/[id]/users` | **List checkout users** - Get all users who have interacted with this checkout, including their wallet addresses and transaction counts. | Required | User management dashboard |
| GET | `/api/checkouts/[id]/stats` | **Get checkout analytics** - Retrieve statistics including total volume, transaction counts by status, and completion rates. | Required | Analytics dashboard |

### Legacy APIs (Deprecated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/widgets/[id]` | Get widget config (use `/api/checkouts/[id]` instead) |

**Note**: The `/api/swaps/*` endpoints have been removed. Use the checkouts API endpoints instead.

### Payment Infrastructure APIs

#### Iron Finance (Enterprise Stablecoin Payments)

Complete customer lifecycle management with KYC, wallets, banks, and payment operations. **[Official Docs →](https://docs.iron.xyz/)**

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| POST | `/api/iron/customers` | **Create a new customer** - Register an individual or business in the Iron system. This is the first step before any payment operations. Required fields include name, email, date of birth, and country. | First step: Register new user |
| GET | `/api/iron/customers` | **List all customers** - Retrieve all registered customers with their KYC status, wallet count, and account metadata. Supports pagination and filtering. | View customer directory |
| POST | `/api/iron/wallets/hosted` | **Create Iron-managed wallet** - Generate a blockchain wallet where Iron controls the private keys. Best for exchanges or platforms that want to manage custody. No user signature required. | Platform manages user funds |
| POST | `/api/iron/wallets/self-hosted` | **Register user's wallet** - Connect a wallet that the user controls (like Dynamic embedded wallets or MetaMask). Requires proof-of-ownership via signed message. This is the recommended approach for self-custody apps. | User controls their wallet |
| POST | `/api/iron/banks` | **Add bank account** - Register a bank account for receiving fiat (offramps). Supports SEPA (Europe), ACH (US), Wire, PIX (Brazil), and Faster Payments (UK). Used to send money from crypto to the user's bank. | Enable cash-out to bank |
| POST | `/api/iron/quotes/onramp` | **Get fiat-to-crypto quote** - Request a price quote for converting fiat currency (USD, EUR, etc.) to cryptocurrency (USDC, USDT). Returns exchange rate, fees, and exact amounts. Quote expires in 30 seconds. | "How much USDC for $100?" |
| POST | `/api/iron/quotes/offramp` | **Get crypto-to-fiat quote** - Request a price quote for converting cryptocurrency to fiat that will be sent to the user's bank account. Returns the amount they'll receive after fees. Quote expires in 30 seconds. | "How much EUR for 100 USDC?" |
| POST | `/api/iron/onramps` | **Execute fiat-to-crypto** - Start an onramp transaction where the user will send fiat and receive crypto. Returns virtual account details (IBAN or account number) where the user should send their bank transfer. Iron monitors for the incoming transfer. | User wants to buy crypto |
| POST | `/api/iron/offramps` | **Execute crypto-to-fiat** - Start an offramp (cash-out) transaction where the user sends crypto and receives fiat in their bank. Returns a deposit address where the user should send their crypto. Once received, Iron converts it and sends fiat to their bank. | User wants to cash out |
| POST | `/api/iron/third-party-payments` | **Business pays for user** - Create a payment where a business pays on behalf of a user (B2B2C model). Useful for platforms that want to cover user transaction fees or provide rewards. | Platform subsidizes user fees |
| POST | `/api/iron/customers/[id]/kyc` | **Start identity verification** - Initiate KYC (Know Your Customer) verification. Returns a URL to redirect the user to Iron's KYC partner for identity verification. Required before first transaction. | Verify user identity |

**Documentation:** See [Iron Official Docs](https://docs.iron.xyz/), `IRON_API_DOCUMENTATION.md`, `IRON_API_FLOWS.md`, and `docs/contributing/api-patterns.md`

#### Other APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api` | Health check |
| POST | `/api/coinbase/onramp` | Create Coinbase onramp order |

## Checkout Configuration

Checkouts support:

- **Mode**: `deposit` (user enters amount) or `payment` (fixed amount)
- **Deposit Destination**: Fixed address or Dynamic embedded wallet
- **Settlement**: Target chain and token for swaps
- **Theme Customization**: Colors, border radius, backgrounds
- **Branding**: Logo, footer toggle
- **AI Import**: Extract colors and logo from any website URL
- **Live Preview**: Real-time preview via iframe

## Payment Infrastructure

### Iron Finance Integration

The dashboard includes a complete Iron Finance integration providing enterprise-grade payment infrastructure for converting between crypto and fiat.

**What you can build:**
- **Onramps**: Users buy crypto with bank transfers (fiat → crypto)
- **Offramps**: Users cash out crypto to their bank accounts (crypto → fiat)
- **Customer Management**: Individual and business accounts with full CRUD
- **KYC Integration**: Built-in identity verification for compliance
- **Wallet Management**: Hosted (Iron manages keys) and self-hosted (user manages keys)
- **Bank Accounts**: Support for SEPA (Europe), ACH (USA), Wire, PIX (Brazil), Faster Payments (UK)
- **Third-Party Payments**: B2B2C model for platforms subsidizing user fees
- **Multi-Currency**: USD, EUR, GBP, BRL, MXN (fiat) + USDC, USDT, USDB, EURC (crypto)
- **Multi-Chain**: Ethereum, Solana, Polygon, Arbitrum, Base, and more

**Quick Start:**
1. Sign up at **[Iron Dashboard](https://app.sandbox.iron.xyz/)** (sandbox) or **[Production](https://app.iron.xyz/)**
2. Get your API key and add to `.env`: `IRON_ENVIRONMENT=sandbox` and `IRON_API_KEY=your_key`
3. Review **[Official Iron Docs](https://docs.iron.xyz/)** for complete API reference
4. Read `IRON_API_DOCUMENTATION.md` for detailed endpoint guides
5. See `IRON_API_FLOWS.md` for visual flow diagrams

**Common Use Cases:**
- User converts 100 USDC to €92 in their bank account (offramp)
- User deposits €100 via bank transfer and receives 108.50 USDC (onramp)
- Platform covers transaction fees for users (third-party payments)
- Business automates crypto-to-fiat conversions for payroll

**Resources:**
- **[Official Documentation](https://docs.iron.xyz/)** - Complete API reference
- `IRON_API_DOCUMENTATION.md` - Detailed endpoint descriptions and code examples
- `IRON_API_FLOWS.md` - Visual diagrams of user journeys
- `docs/contributing/api-patterns.md` - How to build new API routes

## Related Projects

- **apps/checkouts** - The embeddable checkout widget in this monorepo (consumes the dashboard API)

## Development Scripts

### Linting

```bash
pnpm lint
```

### Building

```bash
pnpm build
```

### Running Production Build

```bash
pnpm start
```
