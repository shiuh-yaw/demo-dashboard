# Coding Conventions

**Analysis Date:** 2026-03-31

## Naming Patterns

**Files:**
- Components: `kebab-case.tsx` (e.g., `dashboard-button.tsx`, `auth-menu.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-complete-social-auth.ts`, `use-user-profile.ts`)
- Server actions: `kebab-case.ts` (e.g., `checkouts.ts`, `extract-theme.ts`)
- Services: `kebab-case.ts` (e.g., `lifi.ts`, `blindpay.ts`)
- API routes: `route.ts` in directory structure (e.g., `/api/blindpay/rates/route.ts`)
- Utilities: `index.ts` for packages; explicit exports
- Validation schemas: `kebab-case.ts` in `schemas/` directory

**Functions:**
- camelCase for all functions, methods, and handlers (e.g., `createCheckout()`, `getStatus()`, `formatCurrency()`)
- Prefix with `use` for React hooks (e.g., `useUserProfile()`)
- Handler functions often named `GET`, `POST`, `DELETE` for route.ts files
- Private/internal functions start with underscore: `_initError`, `_request`
- Server actions start with "use server" directive

**Variables:**
- camelCase for all variables and constants
- UPPER_SNAKE_CASE for magic strings when used across multiple files (e.g., see REDIS_KEYS pattern)
- Single-letter variables only in loop contexts (e.g., `for (const e of items)`)

**Types:**
- PascalCase for type and interface names (e.g., `StoredCheckoutConfig`, `TransactionService`, `DashboardButtonProps`)
- Suffix interfaces with `Props` for component props (e.g., `DashboardButtonProps`)
- Suffix types with `Input`, `Output`, `Options`, `Result` for clarity (e.g., `InitializeTransactionInput`, `LiFiQuoteRequest`, `ActionResult<T>`)
- Enum names in PascalCase (e.g., `CheckoutModeEnum`, `TransactionStatusEnum`)

**Constants in Objects:**
- Use CONSTANT_CASE for keys in object literals that represent options (e.g., `BUTTON_VARIANTS`, `BUTTON_SIZES`, `navGroups`)

## Code Style

**Formatting:**
- No explicit formatter configured (no .prettierrc found)
- Target: ES2017 (see tsconfig.json)
- Line endings: LF (implied by Next.js conventions)
- Indentation: 2 spaces (inferred from codebase)

**Linting:**
- ESLint 9.39.1 with Next.js configuration
- Uses flat config format (eslint.config.mjs)
- Key rules:
  - `react/no-unescaped-entities`: off
  - `@typescript-eslint/no-unused-vars`: warn

**TypeScript Strict Mode:**
- Enabled: `"strict": true` in tsconfig.json
- No implicit any, strict null checks, strict function types
- Isolated modules enabled for bundler compatibility

## Import Organization

**Order:**
1. Third-party libraries (e.g., `react`, `next/server`, `zod`)
2. Workspace packages (e.g., `@dynamic-demos/utils`, `@dynamic-demos/theme`)
3. Local absolute imports using `@/` alias (e.g., `@/lib/errors`, `@/components/ui`)
4. Relative imports (rare, used for sibling components or colocated files)

**Path Aliases:**
- `@/*` → `./src/*` (defined in tsconfig.json)
- All imports use absolute paths with `@/` prefix instead of relative paths
- No deep relative imports like `../../../../lib/...`

**Barrel Files:**
- Used for component exports (e.g., `src/components/ui/index.ts` exports DashboardButton, DashboardLinkButton)
- Validation module re-exports schemas from nested `schemas/` directory
- Some actions files colocate related functions (e.g., all checkout-related actions in `actions/checkouts.ts`)

**Module Organization:**
```
src/
├── lib/
│   ├── services/          # Service layer interfaces and implementations
│   ├── actions/           # Server actions for CRUD operations
│   ├── validation/        # Zod schemas, organized by domain
│   ├── types/             # Type definitions
│   ├── auth/              # Authentication utilities
│   ├── dynamic/           # Dynamic SDK integration
│   ├── api-response.ts    # Standardized response handling
│   └── errors.ts          # Custom error classes
├── components/
│   ├── ui/                # Reusable UI components with barrel export
│   ├── auth/              # Auth-specific components
│   ├── shared/            # Shared across multiple features
│   └── [feature]/         # Colocated with feature pages
└── app/                   # Next.js app router
    ├── api/               # API route handlers
    ├── [feature]/         # Feature pages and components
    └── layout.tsx         # Root layout
```

## Error Handling

**Custom Error Classes:**
- Base class: `AppError(message, statusCode?, code?)`
- Subclasses: `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`
- Each maps to HTTP status code (400, 404, 401, 403, 409)
- Errors include optional `code` field for client-side handling (e.g., "NOT_FOUND", "VALIDATION_ERROR")
- Location: `src/lib/errors.ts`

**API Error Handling:**
- Wrapper: `handleApiError(error, context?)` catches and maps errors to NextResponse
- Zod validation errors automatically formatted with field-level error details
- Unknown errors default to 500 status with generic message
- Context parameter logs which endpoint failed (e.g., "[blindpay/rates]")

**Try-Catch in Server Actions:**
```typescript
// Pattern used in checkouts.ts, brands.ts, etc.
try {
  const redis = getRedis();
  // ... business logic
  return { success: true, data: result };
} catch (err) {
  console.error("Failed to [operation]:", err);
  return { success: false, error: "Failed to [operation]" };
}
```

**Server Action Return Type:**
```typescript
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };
```

## Logging

**Framework:** `console` API (no logger library configured)

**Patterns:**
- Errors always logged with operation context: `console.error("Failed to [operation]:", err)`
- Optional module context in brackets: `console.error("[LiFiService] Failed to check status:", error)`
- Warnings for missing configuration: `console.warn("QStash not configured - QSTASH_TOKEN not set")`
- Debug logs in specific service classes: `console.log("[CoinbaseService] Made API request")` 
- Info logs for significant operations
- No timestamps or log levels configured (use console defaults)

**When to Log:**
- Errors: Always log in catch blocks
- Warnings: Missing optional config, fallback behaviors, suspicious states
- Debug: API calls, service initialization, complex state transitions
- Do NOT log in happy path for success states unless debugging

## Comments

**When to Comment:**
- JSDoc blocks for public functions, types, services
- Inline comments for non-obvious logic only
- Section headers with `// =============================================================================` for major code blocks
- Do NOT comment obvious code

**JSDoc/TSDoc:**
- Used extensively in service interfaces and public APIs
- Pattern: `/** Description in one sentence or short paragraph. @param name description @returns description */`
- Classes and interfaces documented
- Enum values documented inline
- Location examples:
  - `src/lib/services/types.ts` - comprehensive interface documentation
  - `src/lib/api-response.ts` - function documentation
  - `src/lib/validation/index.ts` - schema re-exports with brief comments

## Function Design

**Size:** Aim for functions <50 lines. Larger functions broken into smaller helpers.

**Parameters:**
- Prefer named object parameters for functions with >2 parameters
- Use type aliases for complex parameter shapes: `type TransactionListOptions { ... }`
- Optional parameters use `?:` with clear defaults in JSDoc
- Readonly where immutability matters

**Return Values:**
- Async functions return `Promise<T>`
- Server actions return `ActionResult<T>` (discriminated union)
- API route handlers return `NextResponse`
- Query methods return `Promise<T | null>` when resource might not exist
- List methods return `Promise<PaginatedResponse<T>>`

**Const Functions:**
- Small utility functions often declared as const arrow functions: `export const cn = (...inputs) => { ... }`
- Component functions use `const Component = ({ props }) => { ... }` or `function Component() { ... }`
- Named function declarations used for route handlers: `export async function GET(req, { params }) { ... }`

## Module Design

**Exports:**
- Each file exports exactly what it defines (no re-export-everything patterns except barrel files)
- Types and interfaces exported alongside implementations
- Default exports rarely used; prefer named exports

**Service Pattern:**
- Service interfaces defined in `src/lib/services/types.ts`
- Implementations in `src/lib/services/[name].ts`
- Singleton instances created at module level: `export const lifiService = new LiFiService()`
- Services consumed via dependency injection or direct import

**Validation Schemas:**
- Zod schemas organized by domain in `src/lib/validation/schemas/`
- Each schema file exports both the schema and corresponding TypeScript type
- Common reusable schemas in `schemas/common.ts` (e.g., `walletAddress`, `tokenAmount`)
- Validation module (`validation/index.ts`) re-exports for centralized imports

**Action Modules:**
- Each feature has a corresponding action file (e.g., `checkouts.ts`, `brands.ts`, `earns.ts`)
- All mutations use server actions with "use server" directive
- Return `ActionResult<T>` discriminated union type
- Fetch current user context at start of action
- Call `revalidatePath()` after mutations to refresh UI

## Database/State Patterns

**Redis Service Layer:**
- Defined in `src/lib/services/types.ts` with `TransactionService`, `UserService`, `CheckoutService` interfaces
- Implementations in `src/lib/services/redis/` (local Redis for dev, Upstash REST API for prod)
- Key naming convention: `REDIS_KEYS` object with methods like `checkoutConfig(id)`, `transaction(id)`
- All state accessed through service layer, never direct Redis calls outside of service

**Transaction State Machine:**
- Explicit state transitions through named methods: `submit()`, `cancel()`, `fail()`, `confirm()`, `markPending()`, `markExpired()`
- No generic `update()` method that accepts arbitrary state
- State documented in service interface with transition diagram in JSDoc

## Configuration

**Environment Variables:**
- All env vars validated with Zod in `src/env.ts`
- Imported as `import { env } from "@/env"`
- Type-safe at runtime; compile-time checks with t3-oss env-nextjs
- Optional vars marked with `.optional()`, required vars have no default
- All API keys and secrets must come from env, never hardcoded

**Middleware:**
- CORS headers handled in `src/middleware.ts`
- Applies to `/api/:path*` routes only
- Returns 204 for OPTIONS requests, adds headers to all responses

---

*Convention analysis: 2026-03-31*
