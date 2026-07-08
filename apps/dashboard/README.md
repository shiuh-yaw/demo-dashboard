# Dashboard App

The public Dynamic Demos landing page, plus the admin UI and API for managing checkout configurations, tracking transactions, and payment infrastructure integrations. Part of the [Dynamic Demos](../../README.md) monorepo.

**Runs on port 4000** when started via `pnpm dev:dashboard` or `pnpm dev` from the repo root.

## Overview

This app provides:

- **Public demos landing page** - `/` (no auth) showcases the demo apps with launch links and `/demos/[slug]` detail pages; config in `src/lib/landing/demos.ts`
- **Protected dashboard UI** - Create and manage checkouts, brands, earns, and wallets (under `/brands`, `/checkouts`, etc.; sign in via the heart icon in the landing footer)
- **Checkout & Transaction API** - REST API consumed by the `apps/checkouts` widget
- **Iron Finance** - Customer management, KYC, onramps, offramps
- **Coinbase Onramp** - Fiat-to-crypto orders
- **LI.FI** - Cross-chain swap quotes and status polling
- **Background jobs** - QStash worker for transaction status updates

## Quick Start

From the monorepo root:

```bash
pnpm install
cp .example.env .env   # or apps/dashboard/.example.env
pnpm dev:dashboard
```

Dashboard: [http://localhost:4000](http://localhost:4000)

## Environment

Uses `.env` from the repo root or `apps/dashboard/.env`. See the [root README](../../README.md#environment-setup) for required variables.

## Project Structure

```
apps/dashboard/src/
├── app/
│   ├── checkouts/     # Checkout CRUD, transactions, users, settings
│   ├── brands/        # Brand management
│   ├── earns/         # Earn config management
│   ├── wallets/       # Wallet config management
│   ├── documentation/ # API docs (onramp, checkouts, iron, blindpay)
│   └── api/           # REST API routes
├── lib/               # Services, auth, validation
└── components/        # UI components
```

## API

All API routes live under `/api/`. See the [root README API Reference](../../README.md#api-reference) for full documentation.

## Dependencies

Uses shared packages from the monorepo: `@dynamic-demos/ui`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/utils`.
