# Testing Patterns

**Analysis Date:** 2026-03-31

## Test Framework

**Status:** No tests currently configured or present.

**Test Infrastructure:**
- No test runner installed (Jest, Vitest, etc.)
- No test files found in `src/` directories across any apps
- No test configuration files (`jest.config.*`, `vitest.config.*`, etc.)
- No test scripts in package.json

**Recommendation for Future Implementation:**
Given the Next.js + TypeScript stack with server actions and API routes, recommended test setup:
- Test runner: Vitest (modern, fast, ESM-native)
- Component testing: Vitest + React Testing Library
- API/handler testing: Vitest with custom request/response mocks
- Integration testing: Consider Playwright for end-to-end

## Run Commands (Not Currently Available)

```bash
# When tests are added, expected commands:
pnpm test                # Run all tests
pnpm test --watch       # Watch mode
pnpm test --coverage    # Generate coverage report
pnpm test -- checkouts  # Run tests matching pattern
```

## Test File Organization

**When to Add Tests:**

**Location Pattern (Not Yet Implemented):**
- Colocated with source: `src/lib/services/__tests__/lifi.test.ts` next to `src/lib/services/lifi.ts`
- Alternative: `src/__tests__/services/lifi.test.ts` for centralized test directory
- Naming: `*.test.ts` or `*.spec.ts` (recommend `.test.ts` for consistency)

**Suggested Structure:**
```
src/
├── lib/
│   ├── services/
│   │   ├── lifi.ts
│   │   ├── blindpay.ts
│   │   └── __tests__/
│   │       ├── lifi.test.ts
│   │       └── blindpay.test.ts
│   ├── actions/
│   │   ├── checkouts.ts
│   │   └── __tests__/
│   │       └── checkouts.test.ts
│   └── validation/
│       ├── index.ts
│       ├── schemas/
│       └── __tests__/
│           └── schemas.test.ts
└── components/
    ├── __tests__/
    │   ├── dashboard-button.test.tsx
    │   └── sidebar.test.tsx
```

## Critical Areas Requiring Tests

**High Priority (Business Logic):**

1. **Transaction State Machine** (`src/lib/services/types.ts`):
   - Test all state transitions in `TransactionService`
   - Verify invalid transitions are rejected
   - Test concurrent update handling
   - Files: `src/lib/services/redis/transactions.ts`, `src/lib/services/types.ts`

2. **Validation Schemas** (`src/lib/validation/`):
   - Test all Zod schemas parse valid input correctly
   - Test invalid input is rejected with proper error messages
   - Test coercion rules (e.g., `coercedInt`, `coercedPageNumber`)
   - Test async validators if any exist
   - Files: `src/lib/validation/schemas/*.ts`

3. **API Route Handlers** (`src/app/api/**/route.ts`):
   - Test successful request/response flow
   - Test error handling and error response format
   - Test authentication (withAuth wrapper)
   - Test CORS headers present
   - Files: `src/app/api/*/route.ts`

4. **Server Actions** (`src/lib/actions/`):
   - Test CRUD operations (create, get, update, delete)
   - Test authentication checks
   - Test error paths return proper error messages
   - Test revalidatePath() is called
   - Files: `src/lib/actions/*.ts`

5. **Service Layer** (`src/lib/services/`):
   - LiFiService: Quote fetching, status polling, error handling
   - BlindPayService: Rate fetching, validation
   - CoinbaseService: JWT generation, API communication
   - Test error scenarios and retries

6. **Components** (UI/interactive):
   - DashboardButton variants and states
   - Form components and validation feedback
   - Navigation/routing logic
   - Error boundary behaviors

**Medium Priority:**
- Custom error classes and error mapping
- Utility functions (formatCurrency, truncateAddress, etc.)
- Auth middleware and JWT verification
- Redis key naming and data serialization

**Low Priority (Usually Covered by Linting):**
- Type definitions
- Import ordering
- Basic syntax

## Testing Patterns to Implement

### Server Action Testing Pattern

When tests are implemented, use this pattern for `src/lib/actions/checkouts.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createCheckout, getCheckout } from "./checkouts";
import * as session from "@/lib/auth/session";
import * as redis from "@/lib/redis";

describe("checkouts actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCheckout", () => {
    it("should create a new checkout for authenticated user", async () => {
      // Mock authentication
      vi.spyOn(session, "getCurrentUser").mockResolvedValue({
        sub: "user123",
      } as any);

      // Mock Redis
      const setMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(redis, "getRedis").mockReturnValue({
        set: setMock,
        sadd: vi.fn().mockResolvedValue(1),
      } as any);

      const result = await createCheckout("Test Checkout", "payment");

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Test Checkout");
      expect(setMock).toHaveBeenCalled();
    });

    it("should return error when user not authenticated", async () => {
      vi.spyOn(session, "getCurrentUser").mockResolvedValue(null);

      const result = await createCheckout("Test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Authentication required");
    });
  });
});
```

### API Route Handler Testing Pattern

For `src/app/api/blindpay/rates/route.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/blindpay/rates", () => {
  it("should return rates for valid query parameters", async () => {
    const req = new Request(
      "http://localhost:3000/api/blindpay/rates?from=USDC&to=USD&amount=1000&currency_type=sender"
    );

    // Mock auth and services
    vi.mock("@/lib/dynamic/dynamic-auth");
    vi.mock("@/lib/services/blindpay");

    const response = await GET(req as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("should return 400 for missing required parameters", async () => {
    const req = new Request("http://localhost:3000/api/blindpay/rates");
    const response = await GET(req as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
```

### Validation Schema Testing Pattern

For `src/lib/validation/schemas/common.ts` or `schemas/transaction.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { walletAddress, tokenAmount, pageNumber } from "./common";

describe("validation schemas", () => {
  describe("walletAddress", () => {
    it("should parse valid Ethereum address", () => {
      const result = walletAddress.safeParse("0x1234567890123456789012345678901234567890");
      expect(result.success).toBe(true);
      expect(result.data).toBe("0x1234567890123456789012345678901234567890");
    });

    it("should reject invalid address", () => {
      const result = walletAddress.safeParse("not-an-address");
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("address");
    });

    it("should coerce to lowercase", () => {
      const result = walletAddress.safeParse("0xABCD...1234");
      expect(result.data).toBe("0xabcd...1234");
    });
  });

  describe("tokenAmount", () => {
    it("should parse valid amounts", () => {
      const result = tokenAmount.safeParse("1000000000000000000");
      expect(result.success).toBe(true);
    });

    it("should reject negative amounts", () => {
      const result = tokenAmount.safeParse("-100");
      expect(result.success).toBe(false);
    });
  });

  describe("pageNumber", () => {
    it("should coerce string to integer >= 1", () => {
      const result = pageNumber.safeParse("2");
      expect(result.data).toBe(2);
    });

    it("should reject 0 or negative", () => {
      const result = pageNumber.safeParse("0");
      expect(result.success).toBe(false);
    });
  });
});
```

### Service Testing Pattern

For `src/lib/services/lifi.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { lifiService } from "./lifi";

describe("LiFiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getQuote", () => {
    it("should fetch and normalize quote from LI.FI API", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "route123",
          action: {
            fromChainId: 1,
            toChainId: 137,
            fromToken: { symbol: "USDC", decimals: 6 },
            toToken: { symbol: "USDC", decimals: 6 },
            fromAmount: "1000000",
          },
          estimate: {
            toAmount: "1000000",
            fromAmountUSD: "1000",
            toAmountUSD: "1000",
            gasCosts: [{ amountUSD: "10" }],
          },
        }),
      });

      global.fetch = mockFetch;

      const quote = await lifiService.getQuote({
        fromChainId: 1,
        toChainId: 137,
        fromTokenAddress: "0x...",
        toTokenAddress: "0x...",
        toAmount: "1000000",
        fromAddress: "0x1234...",
        toAddress: "0x5678...",
      });

      expect(quote.route.id).toBe("route123");
      expect(quote.route.fromChainId).toBe(1);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should throw LiFiError on API error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "Invalid parameters" }),
      });

      await expect(
        lifiService.getQuote({ /* ... */ } as any)
      ).rejects.toThrow("LI.FI quote failed");
    });
  });

  describe("getStatus", () => {
    it("should return PENDING when fetch fails (retry safe)", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const status = await lifiService.getStatus("0xhash");

      expect(status.status).toBe("PENDING");
    });
  });
});
```

### Component Testing Pattern

For `src/components/ui/dashboard-button.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardButton } from "./dashboard-button";

describe("DashboardButton", () => {
  it("should render with default variant", () => {
    render(<DashboardButton>Click me</DashboardButton>);
    const button = screen.getByRole("button", { name: "Click me" });

    expect(button).toHaveClass("bg-[#335cff]"); // primary variant
  });

  it("should apply outline variant styles", () => {
    render(<DashboardButton variant="outline">Click me</DashboardButton>);
    const button = screen.getByRole("button");

    expect(button).toHaveClass("bg-white");
    expect(button).toHaveClass("border");
  });

  it("should be disabled when disabled prop is true", () => {
    render(<DashboardButton disabled>Click me</DashboardButton>);
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
    expect(button).toHaveClass("opacity-50");
  });

  it("should call onClick handler on click", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<DashboardButton onClick={handleClick}>Click me</DashboardButton>);

    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## Mocking Strategy

**Framework:** Vitest (when implemented) with `vi.mock()`, `vi.spyOn()`

**What to Mock:**
- External API calls (LI.FI, BlindPay, Coinbase, Dynamic SDK)
- Database/Redis calls (via service layer)
- Environment variables
- Authentication (getCurrentUser, withAuth middleware)
- File system operations
- Timers (for debounce/throttle testing)

**What NOT to Mock:**
- Validation schemas (test real Zod behavior)
- Custom error classes
- Utility functions (cn, formatCurrency, etc.)
- Core business logic (state transitions, service interfaces)

## Fixtures and Factories

**Test Data Location (Not Yet Created):**
- `src/__tests__/fixtures/` for static test data
- `src/__tests__/factories/` for dynamic test data builders

**Example Patterns to Follow:**

```typescript
// fixtures/transactions.ts
export const mockTransaction = {
  id: "txn_123",
  checkoutId: "co_456",
  status: "confirmed",
  externalId: "ext_789",
  createdAt: new Date().toISOString(),
};

// factories/transaction.ts
export function createTransaction(overrides = {}) {
  return {
    ...mockTransaction,
    ...overrides,
  };
}

export function createManyTransactions(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createTransaction({ id: `txn_${i}` })
  );
}
```

## Coverage

**Requirements:** Not enforced currently; no test infrastructure

**When Implemented:**
- Target 80%+ coverage for `src/lib/` (services, actions, validation)
- Target 70%+ coverage for components
- 100% coverage for custom error classes and utilities
- Can skip coverage for type-only files and generated code

**View Coverage:**
```bash
# When configured
pnpm test --coverage
# Opens coverage report in HTML format
```

## Test Types

**Unit Tests:** (Primary focus)
- Service methods (LiFiService, BlindPayService, etc.)
- Validation schemas
- Utility functions
- Custom error classes
- Individual server actions
- Individual React components

**Integration Tests:** (Secondary)
- API route handlers with mocked services
- Server actions with mocked auth and storage
- Multi-step workflows (create transaction → submit → poll status)
- Error handling across layers

**E2E Tests:** (Consider for future)
- Framework: Playwright or Cypress
- Critical user journeys:
  - User login → create checkout → see public page
  - Complete transaction flow: initialize → route selection → submit → status polling
  - Admin operations: update brand, manage configurations

## Common Testing Patterns

**Async Testing:**
```typescript
// Use async/await with Vitest
it("should fetch data", async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});

// For promises
it("should handle promise", () => {
  return expect(asyncFunc()).resolves.toEqual(value);
});
```

**Error Testing:**
```typescript
// Test that errors are thrown
it("should throw on invalid input", () => {
  expect(() => invalidFunction()).toThrow("Error message");
});

// Test async errors
it("should reject on invalid input", async () => {
  await expect(asyncFunc()).rejects.toThrow("Error message");
});

// Test caught errors
it("should return error result", async () => {
  const result = await actionThatFails();
  expect(result.success).toBe(false);
  expect(result.error).toBe("Expected error");
});
```

**Type Safety in Tests:**
```typescript
// Use `as any` sparingly; prefer creating proper test doubles
const mockRequest: NextRequest = {
  url: "http://localhost/api/test",
  method: "GET",
  // ... other properties
} as any;

// Or use factory to create properly typed mocks
function createMockRequest(overrides = {}): NextRequest {
  return {
    url: "http://localhost/api/test",
    ...overrides,
  } as NextRequest;
}
```

## Test Isolation

**Before/After Hooks:**
```typescript
beforeEach(() => {
  vi.clearAllMocks();  // Clear all mocks before each test
});

afterEach(() => {
  // Cleanup if needed
});
```

**Module Isolation:**
- Each test file should be independent
- Use vi.resetModules() if tests share state
- Mock at test level, not globally (use beforeEach)

## Current State Summary

- **No tests present** in the codebase
- **High test debt** - critical business logic (transaction state machine, API routes) untested
- **Recommended action:** Implement tests for `src/lib/services/`, `src/lib/validation/`, and `src/app/api/` before adding new features
- **Setup effort:** Low - infrastructure additions needed (Vitest, React Testing Library), but no refactoring required

---

*Testing analysis: 2026-03-31*
