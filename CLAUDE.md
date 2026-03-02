# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Demo Dashboard is a Next.js application for managing checkout configurations and tracking crypto payment transactions. It provides a dashboard UI for creating/managing payment checkouts and API endpoints for runtime integrations.

## Common Commands

```bash
# Install dependencies
pnpm install

# Development (runs on port 4000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint
```

**Local development requires Redis**: `brew install redis && redis-server`

## Architecture

### Service Layer Pattern

The codebase uses a service abstraction layer (`src/lib/services/`) that allows swapping storage implementations:
- **Local development**: Uses `ioredis` connecting to local Redis
- **Production**: Uses `@upstash/redis` REST API

Service interfaces are defined in `src/lib/services/types.ts`. Implementations are in `src/lib/services/redis/`.

### Transaction State Machine

Transactions follow an explicit state machine defined in `src/lib/types/dashboard.ts`:

```
initialized → draft → submitted → pending → confirmed
     ↓         ↓          ↓          ↓
  expired   abandoned   failed    failed
     ↓         ↓
cancelled  cancelled
```

- **initialized**: Created server-side, awaiting user action
- **draft**: Route selected, ready for submission
- **submitted**: txHash sent to chain
- **pending**: Source chain confirmed, awaiting bridge/destination
- **confirmed**: Successfully completed
- **failed/cancelled/expired/abandoned**: Terminal states

State transitions are enforced through explicit service methods (`submit()`, `cancel()`, `fail()`, `confirm()`, etc.) rather than generic updates.

### Authentication

Two auth patterns:
1. **Cookie-based (Dashboard UI)**: Email + OTP via Dynamic SDK, JWT stored in httpOnly cookie
2. **Bearer Token (External API)**: `Authorization: Bearer <jwt>` header

Key files:
- `src/lib/auth/dynamic-jwt.ts` - JWT verification
- `src/lib/auth/session.ts` - Cookie session management
- `src/lib/dynamic/dynamic-auth.ts` - API auth middleware (`withAuth`)

### API Structure

Routes in `src/app/api/`:
- `/checkouts/[id]/*` - Main checkout and transaction CRUD
- `/internal/worker` - QStash background job endpoint
- `/cron/reconcile` - Vercel cron for stale transaction cleanup
- `/coinbase/onramp` - Coinbase onramp integration
- `/blindpay/*` - BlindPay integration for PIX/bank withdrawals
- `/earns/*` - Earnings feature API

Public endpoints (no auth): `GET /api/checkouts/[id]`, `POST /api/checkouts/[id]/transactions`, `GET /api/checkouts/[id]/transactions/[txId]/status`

### Background Processing

- **QStash Worker** (`/api/internal/worker`): Polls LI.FI for transaction status with exponential backoff
- **Cron Reconciliation** (`/api/cron/reconcile`): Marks stale transactions, re-enqueues stuck pending transactions

### Environment Configuration

Environment variables are Zod-validated in `src/env.ts`. See `.example.env` for all options.

Required:
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - Dynamic Labs environment
- `COINBASE_API_KEY` / `COINBASE_API_SECRET` - Coinbase API
- `LIFI_API_KEY` - LI.FI API for swaps

### Key Integrations

- **Dynamic SDK** - Wallet authentication and embedded wallets
- **LI.FI** - Cross-chain swap quotes and status tracking (`src/lib/services/lifi.ts`)
- **Upstash QStash** - Reliable background job processing (`src/lib/upstash/qstash.ts`)
- **Anthropic Claude** - AI theme extraction from URLs
- **BlindPay** - PIX/bank withdrawal processing

### Validation

Zod schemas in `src/lib/validation/schemas/` for runtime validation of:
- Checkout configurations
- Transaction data
- API request/response payloads

### UI Components

Reusable components in `src/components/ui/`. Dashboard-specific components are colocated with their pages in `src/app/checkouts/components/`.
