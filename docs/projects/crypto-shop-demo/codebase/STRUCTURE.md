# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
demo-dashboard/
├── apps/                         # Independent Next.js applications
│   ├── dashboard/                # Main management UI and API backend
│   ├── deposit/                  # Deposit demo with Fireblocks integration
│   ├── checkouts/                # Embedded checkout widget demo
│   ├── earn/                      # Earnings management interface
│   ├── trade/                     # Trading interface
│   ├── wallet/                    # Wallet management interface
│   └── remittance/                # Remittance/payment interface
│
├── packages/                      # Shared reusable packages
│   ├── ui/                        # Reusable React components
│   ├── types/                     # Shared TypeScript type definitions
│   ├── utils/                     # Utility functions and helpers
│   ├── theme/                     # Tailwind CSS theme configuration
│   ├── dynamic/                   # Dynamic SDK integration utilities
│   ├── tsconfig/                  # Shared TypeScript configurations
│   ├── fireblocks/                # Fireblocks SDK wrapper
│   ├── alchemy/                   # Alchemy blockchain API client
│   ├── coingecko/                 # CoinGecko price data integration
│   └── polymarket/                # Polymarket prediction market SDK
│
├── .planning/                     # GSD planning documents
│   └── codebase/                  # Codebase analysis files
│
├── docs/                          # Documentation files
├── package.json                   # Monorepo root (Turborepo)
├── pnpm-workspace.yaml            # pnpm workspaces config
├── turbo.json                     # Turborepo configuration
├── CLAUDE.md                      # Project guidelines for Claude
└── README.md                      # Project overview
```

## Directory Purposes

**`apps/dashboard/`:**
- Purpose: Primary admin interface for managing checkout configs, transactions, brands, earnings, trades, wallets, remittances
- Contains: Page components, API routes, service layer, validation schemas
- Key subdirectories:
  - `src/app/`: Next.js App Router pages and API routes
  - `src/components/`: Shared dashboard components (sidebar, forms, tables)
  - `src/lib/`: Business logic (services, auth, validation, types)
  - `src/hooks/`: React hooks for data fetching and state management

**`apps/deposit/`:**
- Purpose: Crypto deposit demo with Fireblocks wallet integration
- Contains: Deposit flow UI, webhook handlers for Fireblocks, vault management
- Structure mirrors dashboard but focused on single feature

**`apps/checkouts/`:**
- Purpose: Embeddable checkout widget demo
- Contains: Lightweight widget UI, transaction management
- Deployable as iframe/widget in third-party sites

**`apps/earn/`, `apps/trade/`, `apps/wallet/`, `apps/remittance/`:**
- Purpose: Feature-specific demos
- Contains: Feature UI, optional feature-specific API routes
- Independently deployable

**`packages/ui/`:**
- Purpose: Reusable React components used across apps
- Contains: Button, Card, Dialog, Form, Table, Modal, themed components
- Examples: `theme-provider.tsx`, `card.tsx`, `dialog.tsx`, `widget-card.tsx`

**`packages/dynamic/`:**
- Purpose: Dynamic SDK integration utilities
- Contains: JWT verification, wallet connection, auth middleware
- Exports: `verifyDynamicJWT()`, `getJWTFromCookies()`, `withAuth()` for API auth

**`packages/types/`:**
- Purpose: Shared type definitions across all apps
- Contains: Common types for users, wallets, transactions, configurations

**`packages/theme/`:**
- Purpose: Tailwind CSS theme and design tokens
- Contains: Color palette, typography, spacing tokens

**`packages/fireblocks/`, `packages/alchemy/`, `packages/coingecko/`, `packages/polymarket/`:**
- Purpose: SDK wrappers and API clients for external services
- Contains: Typed API wrappers, request/response types, error handling

## Key File Locations

**Entry Points:**
- `apps/dashboard/src/app/layout.tsx`: Root layout with auth gate and sidebar
- `apps/dashboard/src/app/page.tsx`: Landing page (redirects to features)
- `apps/dashboard/src/middleware.ts`: CORS and preflight handling
- `apps/deposit/app/page.tsx`: Deposit demo entry point

**Configuration:**
- `apps/dashboard/src/env.ts`: Environment variable validation (Zod)
- `apps/dashboard/.env.example`: Template for required env vars
- `turbo.json`: Turborepo build and dev configurations
- `pnpm-workspace.yaml`: Workspace definitions

**Core Logic:**
- `apps/dashboard/src/lib/services/types.ts`: Service interface definitions
- `apps/dashboard/src/lib/services/index.ts`: Service factory and initialization
- `apps/dashboard/src/lib/services/redis/`: Redis implementations of services
- `apps/dashboard/src/lib/types/dashboard.ts`: Data types (transactions, checkouts, configs)
- `apps/dashboard/src/lib/validation/`: Zod schemas (common, transaction, checkout)

**Authentication:**
- `apps/dashboard/src/lib/auth/session.ts`: Cookie session management
- `packages/dynamic/src/`: JWT verification and Dynamic SDK utils
- `apps/dashboard/src/app/api/`: Routes with `withAuth()` middleware for protected endpoints

**Testing:**
- Test files not found in current structure (none detected)

**API Routes:**
- `apps/dashboard/src/app/api/checkouts/[id]/`: Checkout CRUD
- `apps/dashboard/src/app/api/checkouts/[id]/transactions/`: Transaction management
- `apps/dashboard/src/app/api/checkouts/handlers/`: Handler functions for checkout operations
- `apps/dashboard/src/app/api/brands/`: Brand profile management
- `apps/dashboard/src/app/api/earns/`, `apps/dashboard/src/app/api/trade/`, etc.: Feature-specific APIs
- `apps/dashboard/src/app/api/internal/worker`: QStash background job handler
- `apps/dashboard/src/app/api/cron/reconcile`: Cron job for transaction reconciliation

**UI Components:**
- `apps/dashboard/src/components/ui/`: Dashboard-specific UI components
- `apps/dashboard/src/components/shared/`: Shared components within dashboard app
- `apps/dashboard/src/components/auth/`: Authentication components
- `packages/ui/src/`: Reusable components across all apps

## Naming Conventions

**Files:**
- Page files: `[featureName]/page.tsx` or `[featureName]/new/page.tsx`
- Layout files: `layout.tsx` (Next.js convention)
- API route handlers: `route.ts` (Next.js convention)
- Business logic: `[entity].ts` or `[action]-[entity].ts` (e.g., `get-checkout.ts`)
- React components: `[ComponentName].tsx` (PascalCase)
- Utilities and hooks: `[functionName].ts` (camelCase)
- Types: `[domain].ts` (e.g., `dashboard.ts`, `transaction.ts`)
- Validation: `[domain].ts` in `validation/schemas/` (e.g., `checkout.ts`, `transaction.ts`)

**Directories:**
- Feature directories: lowercase (e.g., `checkouts/`, `brands/`, `earns/`)
- API routes: Route segments in brackets for params (e.g., `[id]/`, `[txId]/`)
- Shared code: `lib/`, `components/`, `hooks/`, `utils/` (Next.js convention)
- Service implementations: `services/redis/` for Redis, `services/` for interfaces

**Functions:**
- Handlers: `handle[Action][Entity]` (e.g., `handleGetCheckout`, `handleSubmitTransaction`)
- API utilities: Verb-based (e.g., `createResponse()`, `handleApiError()`)
- Service methods: Verb-based (e.g., `get()`, `list()`, `submit()`, `markPending()`)
- Hooks: Prefix with `use` (e.g., `useCheckoutConfig()`, `useTransactions()`)

## Where to Add New Code

**New Feature (e.g., new demo type like "Staking"):**
1. Create new app: `apps/staking/` (mirror structure of `apps/earn/`)
2. Core logic in `apps/dashboard/src/lib/services/staking.ts` if backend needed
3. API routes in `apps/dashboard/src/app/api/staking/`
4. Types in `apps/dashboard/src/lib/types/dashboard.ts` (add `StakingConfig` interface)
5. Validation in `apps/dashboard/src/lib/validation/schemas/staking.ts`

**New Component:**
- Reusable across apps: `packages/ui/src/[ComponentName].tsx` + export in `packages/ui/src/index.ts`
- Dashboard-only: `apps/dashboard/src/components/ui/[ComponentName].tsx` or `apps/dashboard/src/components/[feature]/[ComponentName].tsx`
- Feature-specific in sub-app: `apps/[appName]/components/[ComponentName].tsx`

**New API Endpoint:**
1. Create handler: `apps/dashboard/src/app/api/[feature]/handlers/[action].ts`
2. Create route: `apps/dashboard/src/app/api/[feature]/[[id]]/route.ts`
3. Add validation schema: `apps/dashboard/src/lib/validation/schemas/[feature].ts`
4. Implement in handler:
   ```typescript
   // Validate input
   const parsed = parseWithSchema(mySchema, rawInput);
   
   // Call service
   const result = await myService.action(parsed);
   
   // Return response
   return createResponse(result);
   ```
5. Add auth if needed: Wrap route handler with `withAuth()` middleware

**New Utility Function:**
- Shared across apps: `packages/utils/src/[category].ts` (or `packages/[serviceName]/src/`)
- Dashboard-only: `apps/dashboard/src/lib/utils/[category].ts`

**New Service:**
- Interface: Add to `apps/dashboard/src/lib/services/types.ts`
- Implementation: `apps/dashboard/src/lib/services/redis/[service-name].ts`
- Registration: Export from `apps/dashboard/src/lib/services/index.ts`

## Special Directories

**`apps/dashboard/src/app/api/checkouts/handlers/`:**
- Purpose: Separates HTTP concerns from business logic
- Generated: No (committed to repo)
- Pattern: Each handler is a pure async function that validates input, calls services, returns data
- Import pattern: Handlers imported in `route.ts` files, wrapped in `withApiHandler()`

**`apps/dashboard/src/lib/services/redis/`:**
- Purpose: Redis client implementation of service interfaces
- Generated: No
- Details:
  - `transaction.ts`: TransactionService implementation with state machine logic
  - `user.ts`: UserService implementation for user tracking
  - `checkout.ts`: CheckoutService implementation for config caching
- Uses: `ioredis` in dev, `@upstash/redis` in production (abstracted via client factory)

**`apps/dashboard/src/lib/validation/schemas/`:**
- Purpose: Centralized Zod schema definitions
- Generated: No
- Pattern: Each domain (transaction, checkout, common) has its own file
- Usage: Imported in `index.ts` and re-exported for use in handlers

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes (by next build)
- Committed: No

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by GSD mapper)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md

---

*Structure analysis: 2026-03-31*
