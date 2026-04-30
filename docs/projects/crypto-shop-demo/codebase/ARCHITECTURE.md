# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Multi-app monorepo with service-abstraction layer and modular feature apps

**Key Characteristics:**
- Monorepo structure (Turborepo) with 7 independent Next.js demo apps sharing common packages
- Service layer abstraction enabling swappable storage implementations (Redis/HTTP)
- Explicit state machine for transaction lifecycle with clear state transitions
- API-first design with handler/route separation for clean error handling
- Modular configuration system for theming and branding across apps

## Layers

**Application Layer (Next.js Apps):**
- Purpose: Feature-specific UI and API implementations
- Location: `apps/dashboard/`, `apps/deposit/`, `apps/earn/`, `apps/trade/`, `apps/wallet/`, `apps/remittance/`, `apps/checkouts/`
- Contains: Page components, API routes, feature-specific hooks and components
- Depends on: Shared packages, service layer, external APIs (Dynamic, LI.FI, Fireblocks, Iron, etc.)
- Used by: End users via browser, external integrations via REST API

**API Route Layer:**
- Purpose: Request handling, validation, error responses
- Location: `apps/dashboard/src/app/api/`
- Contains: Route handlers (`route.ts` files) that delegate to handler functions
- Depends on: Handler layer, middleware, auth utilities
- Pattern: Routes use `withApiHandler()` wrapper for consistent error handling and CORS

**Handler Layer:**
- Purpose: Business logic implementation, decoupled from HTTP details
- Location: `apps/dashboard/src/app/api/*/handlers/`
- Contains: Pure async functions that parse validated input and call services
- Depends on: Service layer, validation schemas, type definitions
- Pattern: Each handler is a named export function taking raw input, parsing with Zod schema, calling services

**Service Layer:**
- Purpose: Data persistence and external service integration abstraction
- Location: `apps/dashboard/src/lib/services/`
- Contains: Interfaces (`types.ts`), Redis implementations (`redis/`), external service clients (LI.FI, Iron, Fireblocks, BlindPay)
- Depends on: Data stores (Redis, Upstash), external APIs
- Used by: Handlers exclusively
- Key services:
  - `TransactionService`: State machine for checkout transactions
  - `UserService`: User wallet and stats tracking
  - `CheckoutService`: Checkout config and stats caching
  - `LI.FI`: Cross-chain swap quotes and status
  - `Iron`: Banking and on/off-ramp integration
  - `BlindPay`: PIX and bank withdrawal processing
  - `Fireblocks`: Wallet custody and transaction signing

**Shared Packages:**
- Purpose: Code reuse across apps
- Location: `packages/`
- Contains:
  - `@dynamic-demos/ui`: Reusable React components (cards, dialogs, theme provider)
  - `@dynamic-demos/theme`: Tailwind CSS theme configuration
  - `@dynamic-demos/types`: Shared type definitions
  - `@dynamic-demos/utils`: Utility functions
  - `@dynamic-demos/dynamic`: JWT verification and Dynamic SDK integration
  - `@dynamic-demos/fireblocks`: Fireblocks SDK wrapper
  - `@dynamic-demos/alchemy`: Alchemy API client
  - `@dynamic-demos/coingecko`: CoinGecko price data integration
  - `@dynamic-demos/polymarket`: Polymarket prediction market integration

**Validation Layer:**
- Purpose: Runtime validation of inputs, type-safe parsing
- Location: `apps/dashboard/src/lib/validation/`
- Contains: Zod schemas organized by domain (common, transaction, checkout, etc.)
- Pattern: Schemas imported in validation index, single `parseWithSchema()` utility for all validation

**Authentication Layer:**
- Purpose: User identity verification and session management
- Location: `apps/dashboard/src/lib/auth/`
- Contains:
  - `session.ts`: Cookie-based auth for dashboard UI (JWT in httpOnly cookie)
  - Dynamic JWT verification utilities: `@dynamic-demos/dynamic` package
- Pattern: Two auth modes:
  1. Dashboard UI: Dynamic SDK auth → JWT in httpOnly cookie via `setDynamicJWT()`
  2. External API: `Authorization: Bearer <jwt>` header via `withAuth()` middleware

**Middleware:**
- Purpose: Cross-cutting concerns (CORS, auth checks)
- Location: `apps/dashboard/src/middleware.ts`
- Handles: CORS headers for all API requests, OPTIONS preflight responses
- Pattern: Next.js middleware runs on `/api/*` routes only

## Data Flow

**Checkout Widget (Public) Flow:**

1. Widget client calls `GET /api/checkouts/[id]` (public, no auth)
2. Route handler calls `handleGetCheckout()`
3. Handler validates ID with `checkoutIdSchema`, calls `checkoutService.get()`
4. Service returns stored config from Redis/Upstash
5. Route returns `{ success: true, data: config }` with CORS headers

**Transaction Submission (Authenticated) Flow:**

1. Dashboard user submits transaction
2. Client calls `POST /api/checkouts/[id]/transactions/[txId]/submit` with JWT
3. Route handler checks auth with `withAuth()`, calls `handleSubmitTransaction()`
4. Handler parses/validates input, calls `transactionService.submit()`
5. Service validates state machine transition, updates Redis, returns updated transaction
6. Background worker (QStash) polls LI.FI for status updates on pending transactions
7. Worker calls `transactionService.markPending()` and `transactionService.confirm()` as needed
8. Dashboard UI polls `GET /api/checkouts/[id]/transactions/[txId]/status` for updates

**State Management:**
- Transient state (UI, sessions): Browser memory + React state
- Configuration state (checkouts, branding, themes): Redis/Upstash
- Transaction state (lifecycle, attempts): Redis/Upstash with explicit state transitions
- User state (wallets, stats): Redis/Upstash with aggregated updates

## Key Abstractions

**Transaction State Machine:**
- Purpose: Enforce valid state transitions, prevent invalid operations
- Examples: `apps/dashboard/src/lib/types/dashboard.ts` (Status constants), `apps/dashboard/src/lib/services/types.ts` (TransactionService interface)
- Pattern: Each state transition is an explicit method on TransactionService
  - Lifecycle transitions: `initialize()`, `addRouteData()`, `submit()`
  - Status transitions: `markPending()`, `confirm()`, `fail()`, `cancel()`
  - Validation: Service enforces allowed transitions
- States: initialized → draft → submitted → pending → confirmed (with terminal states: failed, expired, abandoned, cancelled)

**Service Abstraction (Storage Interface):**
- Purpose: Allow swapping implementations without changing handlers
- Examples: `apps/dashboard/src/lib/services/types.ts` defines interfaces, `apps/dashboard/src/lib/services/redis/` implements them
- Pattern:
  - Interfaces: `TransactionService`, `UserService`, `CheckoutService` in `types.ts`
  - Implementation: Redis client wrapper in `redis/transaction.ts`, `redis/user.ts`, `redis/checkout.ts`
  - Factory: Services instantiated in `apps/dashboard/src/lib/services/index.ts`
- Swappability: Handlers call `transactionService.get()` without knowing storage impl

**Configuration Schemas:**
- Purpose: Type-safe widget and app configuration
- Examples: `StoredCheckoutConfig`, `WidgetConfig`, `EarnConfig`, `WalletConfig`
- Pattern: Config interfaces in `apps/dashboard/src/lib/types/dashboard.ts`, runtime validation via Zod in `apps/dashboard/src/lib/validation/`
- Defaults: Centralized defaults (e.g., `DEFAULT_EARN_THEME`) allow consistent theming

**API Response Wrapper:**
- Purpose: Standardized success/error responses, CORS handling
- Examples: `apps/dashboard/src/lib/api-response.ts`
- Pattern: All handlers return `createResponse()` on success or throw `AppError` subclass, caught by `handleApiError()`
- Response format: `{ success: true, data: T }` for success, `{ error: string, code?: string }` for errors

## Entry Points

**Dashboard Web App:**
- Location: `apps/dashboard/src/app/`
- Triggers: Browser navigation to dashboard URL
- Responsibilities:
  - Root layout: Loads fonts, global styles, authentication check
  - Auth gate: Routes unauthenticated users to login form
  - Sidebar: Navigation to features (Checkouts, Brands, Wallets, Earn, Trade, Remittance)
  - Page routes: Feature-specific pages (create, edit, list, detail views)

**Dashboard API:**
- Location: `apps/dashboard/src/app/api/`
- Triggers: Client-side API calls (fetch, axios)
- Responsibilities:
  - Public endpoints: Checkout configs, transaction status (no auth)
  - Authenticated endpoints: Manage configs, view transactions (JWT auth required)
  - Background endpoints: QStash worker, Cron reconciliation

**Sub-Apps (Deposit, Earn, Trade, etc.):**
- Location: `apps/deposit/`, `apps/earn/`, etc.
- Triggers: Direct URL navigation or embedded in third-party sites
- Responsibilities: Feature-specific UI and API (may have own handlers/services)

## Error Handling

**Strategy:** Custom error classes map to HTTP status codes

**Patterns:**
- `AppError`: Base class with statusCode and code properties
- `ValidationError` (400): Zod schema validation failures
- `NotFoundError` (404): Resource not found in service
- `UnauthorizedError` (401): Missing or invalid JWT
- `ForbiddenError` (403): User lacks permission
- `ConflictError` (409): State machine violation (e.g., invalid transition)

**Flow:**
1. Handler throws `AppError` subclass or allows Error to propagate
2. `withApiHandler()` catches error, calls `handleApiError()`
3. `handleApiError()` maps error to HTTP response with appropriate status
4. Response includes error message, optional code, and validation details (for Zod errors)

## Cross-Cutting Concerns

**Logging:** Console-based (via `console.error()` in error handlers)
- Context: Passed to `withApiHandler()` and `handleApiError()` for debugging
- Not captured to external service (can be added via middleware)

**Validation:** Zod schemas at API boundary
- All handler inputs validated with `parseWithSchema()`
- Zod errors automatically converted to 400 response with field-level details
- Schemas reusable across routes (e.g., `paginationSchema` for list endpoints)

**Authentication:** Two-mode system
- Dashboard UI: JWT in httpOnly cookie, verified with `getCurrentUser()`
- External API: `Authorization: Bearer <jwt>` header, verified in `withAuth()` middleware
- Token issued by Dynamic SDK, verified using `verifyDynamicJWT()` from `@dynamic-demos/dynamic`

**CORS:** Wildcard origin with explicit method/header allowlist
- Configured globally in `middleware.ts`
- Headers added by `addCorsHeaders()` to all API responses
- Preflight OPTIONS requests handled in middleware

---

*Architecture analysis: 2026-03-31*
