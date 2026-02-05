# Demo Dashboard

A Next.js application for managing checkout configurations and tracking transactions. Features a protected dashboard UI for creating and managing payment/deposit checkouts, real-time transaction monitoring, and API endpoints for runtime integrations.

## Features

- **Checkout Management** - Create and configure payment/deposit checkouts with custom themes
- **Transaction Tracking** - Real-time transaction lifecycle monitoring from initialization to completion
- **User Management** - Track users and their connected wallets per checkout
- **Dynamic Authentication** - Email + OTP authentication via Dynamic SDK
- **Service Layer Architecture** - Abstracted data layer (Redis) ready for future migrations
  - Uses `ioredis` for local development and `@upstash/redis` for production
- **Background Job Processing** - QStash-powered reliable transaction status polling
- **Coinbase Onramp API** - Runtime API for fiat-to-crypto demos
- **LI.FI Quote API** - Single-step quote endpoint for cross-chain swaps and bridges
- **AI Theme Extraction** - Import branding from any URL using Claude

## Technology Stack

- **Next.js** 15.5.9 - React framework with App Router
- **React** 19.1.4 - UI library
- **TypeScript** 5.9.3 - Type safety
- **Tailwind CSS** 4.1.17 - Styling with CSS-in-JS
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

Copy `.example.env` to `.env` and configure:

```bash
cp .example.env .env
```

See `.example.env` for all available configuration options.

**Required variables:**

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - Dynamic Labs environment
- `COINBASE_API_KEY` / `COINBASE_API_SECRET` - Coinbase API
- `LIFI_API_KEY` - LI.FI API for swaps

**Optional for full features:**

- `QSTASH_TOKEN` / `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` - Background jobs (QStash)
- `ANTHROPIC_API_KEY` - AI theme extraction (Claude API)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - Production Redis (Upstash)
- `APP_URL` - Base URL for QStash callbacks (required in production)
- `CRON_SECRET` - Secret for authenticating Vercel cron jobs

### Development

```bash
pnpm dev
```

- Dashboard: [http://localhost:3000](http://localhost:3000)
- API Health Check: [http://localhost:3000/api](http://localhost:3000/api)

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

## Project Structure

```
src/
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
│   │   │
│   │   ├── checkouts/                # Checkout & Transaction API
│   │   │   ├── handlers/             # Business logic handlers
│   │   │   └── [id]/
│   │   │       ├── transactions/     # Transaction CRUD
│   │   │       │   └── [txId]/       # Single transaction operations
│   │   │       │       ├── quote/    # Get transaction quote
│   │   │       │       ├── submit/   # Submit with txHash
│   │   │       │       └── status/   # Get/update transaction status
│   │   │       ├── users/            # List users
│   │   │       └── stats/            # Checkout statistics
│   │   │
│   │   │
│   │   ├── coinbase/onramp/          # Coinbase onramp API
│   │   ├── widgets/[id]/             # Legacy widget config (deprecated)
│   │   │
│   │   ├── cron/reconcile/           # Vercel cron job
│   │   └── internal/worker/          # QStash callback endpoint
│   │
│   ├── onramp/page.tsx               # Coinbase onramp docs
│   ├── lifi/page.tsx                 # LI.FI API docs
│   └── widgets/                      # Legacy widget routes (deprecated)
│
├── lib/
│   ├── services/                     # Service layer (abstraction)
│   │   ├── types.ts                  # Service interfaces
│   │   ├── redis/                    # Redis implementations
│   │   │   ├── checkouts.ts
│   │   │   ├── transactions.ts
│   │   │   └── users.ts
│   │   ├── lifi.ts                   # LI.FI API service
│   │   └── workflows.ts              # Cross-service operations
│   │
│   ├── upstash/
│   │   └── qstash.ts                 # QStash client & helpers
│   │
│   ├── validation/                   # Zod schemas
│   │   └── schemas/
│   │       ├── common.ts             # Shared validators
│   │       ├── checkout.ts           # Checkout schemas
│   │       └── transaction.ts        # Transaction schemas
│   │
│   ├── actions/                      # Server actions
│   │   ├── checkouts.ts              # Checkout CRUD
│   │   └── extract-theme.ts          # AI theme extraction
│   │
│   ├── auth/                         # Authentication
│   │   ├── dynamic-jwt.ts            # JWT verification
│   │   └── session.ts                # Cookie-based session
│   │
│   ├── dynamic/dynamic-auth.ts       # API auth middleware (withAuth)
│   ├── api-response.ts               # Standardized API responses
│   ├── errors.ts                     # Custom error classes
│   ├── redis.ts                      # Redis client
│   └── types/dashboard.ts            # Core types & Status constants
│
├── components/ui/                    # Reusable UI components
└── env.ts                            # Environment configuration (Zod validated)
```

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

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/checkouts/[id]` | Get checkout configuration | Public |
| GET | `/api/checkouts/[id]/transactions` | List transactions (paginated, filterable) | Required |
| POST | `/api/checkouts/[id]/transactions` | Initialize a transaction | Public |
| GET | `/api/checkouts/[id]/transactions/[txId]` | Get transaction details | Required |
| PATCH | `/api/checkouts/[id]/transactions/[txId]` | Update transaction (add route data) | Required |
| POST | `/api/checkouts/[id]/transactions/[txId]/quote` | Get transaction quote from LI.FI | Required |
| POST | `/api/checkouts/[id]/transactions/[txId]/submit` | Submit transaction with txHash | Required |
| GET | `/api/checkouts/[id]/transactions/[txId]/status` | Get transaction status | Public |
| PATCH | `/api/checkouts/[id]/transactions/[txId]/status` | Update transaction status | Required |
| GET | `/api/checkouts/[id]/users` | List users for checkout | Required |
| GET | `/api/checkouts/[id]/stats` | Get checkout statistics | Required |

### Legacy APIs (Deprecated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/widgets/[id]` | Get widget config (use `/api/checkouts/[id]` instead) |

**Note**: The `/api/swaps/*` endpoints have been removed. Use the checkouts API endpoints instead.

### Other APIs

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

## Related Projects

- **nextjs-payment-widget** - The checkout widget that consumes this API

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
