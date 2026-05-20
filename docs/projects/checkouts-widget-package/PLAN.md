# `packages/checkouts-widget` Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the wallet-source payment widget out of `apps/checkouts/` into a workspace package consumable directly by a new in-monorepo host app (no iframe). `apps/checkouts/` becomes a thin consumer of the same package.

**Architecture:** Workspace package `@dynamic-demos/checkouts-widget` under `packages/checkouts-widget/`. Pure React component + hook + SSR-safe SDK wrappers. Host owns the Dynamic provider; config flows as props; dashboard-mirror lives in `apps/checkouts/` and wires lifecycle callbacks. Spec lives at `docs/projects/checkouts-widget-package/SPEC.md`.

**Tech Stack:** TypeScript, React 19, Vitest + jsdom + @testing-library/react, `@dynamic-labs-sdk/client@0.25.0`, `@dynamic-labs/iconic`, Tailwind v4 (consumed via host).

**Checkpoint:** `checkpoint/pre-widget-package` (revert with `git reset --hard checkpoint/pre-widget-package`).

---

## File structure (target end state)

**New package:**

```
packages/checkouts-widget/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── AGENTS.md
├── src/
│   ├── index.ts                              # public surface (PaymentWidget + types + sub-paths)
│   ├── PaymentWidget.tsx                     # top-level component
│   ├── checkout-flow/
│   │   ├── index.ts                          # SSR-safe SDK wrappers
│   │   ├── status-map.ts
│   │   └── storage.ts
│   ├── hooks/
│   │   └── use-checkout-flow.ts
│   ├── components/
│   │   ├── icons.tsx
│   │   ├── deposit-amount-screen.tsx
│   │   ├── review-payment-screen.tsx
│   │   ├── transaction-progress-screen.tsx
│   │   ├── token-conversion-card.tsx
│   │   ├── screen-header.tsx
│   │   ├── info-box.tsx
│   │   └── error-banner.tsx
│   └── lib/
│       ├── types.ts                          # ExecutionUpdate, ReviewQuote, ExecutionStatus, Token, BrandConfig
│       ├── format.ts                         # formatRawTokenAmount, formatUsd, formatTokenAmount, parseUsd, formatErrorMessage, isUserRejection
│       └── chain.ts                          # isSolanaChainId + chain-id helpers (renamed from widget-config.ts to drop demo-config coupling)
└── __tests__/
    ├── checkout-flow/
    │   ├── wrappers.test.ts
    │   └── status-map.test.ts
    ├── use-checkout-flow.test.ts
    └── PaymentWidget.smoke.test.tsx
```

**`apps/checkouts/` after extraction:**

- `lib/checkout-flow/` → **removed** (now in the package)
- `hooks/use-checkout-flow.ts` → **removed**
- `lib/format.ts` → **removed** (re-exported from package if app code still uses it; otherwise just deleted)
- `lib/widget-config.ts` → trimmed to demo-config-only helpers (move `isSolanaChainId` to the package as `chain.ts`)
- `lib/types.ts` → trimmed to app-level types (`Transaction`, `Status`, `StoredCheckoutConfig`, `ApiResponse`); widget types re-exported from the package
- `components/payment-modal/deposit-amount-screen.tsx`, `review-payment-screen.tsx`, `transaction-progress-screen.tsx`, `token-conversion-card.tsx`, `screen-header.tsx`, `info-box.tsx`, `error-banner.tsx` → **removed** (in package)
- `components/payment-widget/screens/review-screen.tsx`, `processing-screen.tsx` → **removed** (in package)
- `components/payment-widget/index.tsx` → refactored to mount `<PaymentWidget />` from the package when the user has selected a wallet + asset

---

## Task 1: Create the package skeleton

**Files:**
- Create: `packages/checkouts-widget/package.json`
- Create: `packages/checkouts-widget/tsconfig.json`
- Create: `packages/checkouts-widget/vitest.config.ts`
- Create: `packages/checkouts-widget/src/index.ts`
- Create: `packages/checkouts-widget/AGENTS.md`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@dynamic-demos/checkouts-widget",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./checkout-flow": "./src/checkout-flow/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "dependencies": {
    "@dynamic-demos/utils": "workspace:*",
    "@dynamic-demos/ui": "workspace:*",
    "@dynamic-labs/iconic": "catalog:",
    "zod": "3.25.76"
  },
  "peerDependenciesMeta": {
    "react": { "optional": false },
    "react-dom": { "optional": false }
  },
  "devDependencies": {
    "@dynamic-demos/tsconfig": "workspace:*",
    "@dynamic-labs-sdk/client": "catalog:",
    "@dynamic-labs-sdk/evm": "catalog:",
    "@testing-library/react": "16.0.1",
    "@types/node": "20.19.25",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "26.0.0",
    "react": "catalog:",
    "react-dom": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "extends": "@dynamic-demos/tsconfig/library.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "noEmit": true
  },
  "include": ["src/**/*", "__tests__/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

(`noEmit: true` overrides the library preset's `emitDeclarationOnly` because we ship source via the `exports` map — no build step.)

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  css: { postcss: { plugins: [] } },
  test: {
    globals: false,
    environment: "jsdom",
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 4: Write `src/index.ts`** (empty stub for now)

```ts
// Public surface for @dynamic-demos/checkouts-widget.
// Populated by subsequent tasks.
export {};
```

- [ ] **Step 5: Write `AGENTS.md`**

```markdown
---
package: "@dynamic-demos/checkouts-widget"
status: scaffold
custody: peer
provider_docs: https://www.dynamic.xyz/docs/javascript/reference/client/checkout-flow
---

# @dynamic-demos/checkouts-widget

Wallet-source payment widget extracted from `apps/checkouts/`.
Consumed directly by host apps as a React component (no iframe).

See `docs/projects/checkouts-widget-package/SPEC.md` for the design contract.
```

- [ ] **Step 6: Install + typecheck**

```bash
pnpm install
pnpm --filter @dynamic-demos/checkouts-widget typecheck
```

Expected: clean install (workspace globs pick up the new package automatically), typecheck passes (empty package).

- [ ] **Step 7: Commit**

```bash
git add packages/checkouts-widget pnpm-lock.yaml
git commit -m "feat(checkouts-widget): scaffold packages/checkouts-widget package"
```

---

## Task 2: Move `checkout-flow/` library + its tests into the package

**Files:**
- Move: `apps/checkouts/lib/checkout-flow/index.ts` → `packages/checkouts-widget/src/checkout-flow/index.ts`
- Move: `apps/checkouts/lib/checkout-flow/status-map.ts` → `packages/checkouts-widget/src/checkout-flow/status-map.ts`
- Move: `apps/checkouts/lib/checkout-flow/storage.ts` → `packages/checkouts-widget/src/checkout-flow/storage.ts`
- Move: `apps/checkouts/__tests__/checkout-flow/wrappers.test.ts` → `packages/checkouts-widget/__tests__/checkout-flow/wrappers.test.ts`
- Move: `apps/checkouts/__tests__/checkout-flow/status-map.test.ts` → `packages/checkouts-widget/__tests__/checkout-flow/status-map.test.ts`
- Modify: `apps/checkouts/hooks/use-checkout-flow.ts` (update import path)
- Modify: `apps/checkouts/components/payment-widget/use-payment-actions.ts` (any direct imports)
- Modify: `apps/checkouts/package.json` (add `@dynamic-demos/checkouts-widget` dep)

- [ ] **Step 1: Move the source files**

```bash
mkdir -p packages/checkouts-widget/src/checkout-flow
git mv apps/checkouts/lib/checkout-flow/index.ts      packages/checkouts-widget/src/checkout-flow/index.ts
git mv apps/checkouts/lib/checkout-flow/status-map.ts packages/checkouts-widget/src/checkout-flow/status-map.ts
git mv apps/checkouts/lib/checkout-flow/storage.ts    packages/checkouts-widget/src/checkout-flow/storage.ts
rmdir apps/checkouts/lib/checkout-flow
```

- [ ] **Step 2: Update `status-map.ts` imports**

The file imports `ExecutionUpdate` from `@/lib/types`. Until Task 4 moves types, leave the import alone but switch its alias root via tsconfig (already `@/` → `./src/`). Add a temporary local types module:

Create `packages/checkouts-widget/src/checkout-flow/types-local.ts`:

```ts
// Temporary — superseded by src/lib/types.ts in Task 4.
import type { ExecutionUpdate } from "../lib/types";
export type { ExecutionUpdate };
```

…and inside `status-map.ts` change:

```ts
import type { ExecutionUpdate } from "@/lib/types";
```

to:

```ts
import type { ExecutionUpdate } from "./types-local";
```

Then create the bare minimum types module so the imports resolve. Create `packages/checkouts-widget/src/lib/types.ts`:

```ts
export type ExecutionStatus =
  | "PENDING"
  | "ACTION_REQUIRED"
  | "RUNNING"
  | "DONE"
  | "FAILED";

export interface ExecutionUpdate {
  stepIndex: number;
  totalSteps: number;
  processType?: string;
  status: ExecutionStatus;
  txHash?: string;
  isBridging?: boolean;
  isCrossChain?: boolean;
  lifiExplorerLink?: string;
}
```

This shim lets the moved files compile inside the package immediately. Task 4 will move the rest of `types.ts` and consolidate.

- [ ] **Step 3: Move the tests**

```bash
mkdir -p packages/checkouts-widget/__tests__/checkout-flow
git mv apps/checkouts/__tests__/checkout-flow/wrappers.test.ts   packages/checkouts-widget/__tests__/checkout-flow/wrappers.test.ts
git mv apps/checkouts/__tests__/checkout-flow/status-map.test.ts packages/checkouts-widget/__tests__/checkout-flow/status-map.test.ts
rmdir apps/checkouts/__tests__/checkout-flow
```

In `wrappers.test.ts`, change:

```ts
vi.mock("@/lib/dynamicClient", () => ({}));
```

to:

```ts
// no Dynamic client coupling inside the package — wrappers call SDK directly
```

(delete the line entirely)

In `status-map.test.ts`, change all imports from `@/lib/checkout-flow/status-map` to `@/checkout-flow/status-map` and any `@/lib/types` to `@/lib/types` (alias already points at package `src/`).

- [ ] **Step 4: Add the workspace dep + update app imports**

In `apps/checkouts/package.json` add to `dependencies`:

```json
"@dynamic-demos/checkouts-widget": "workspace:*",
```

In `apps/checkouts/hooks/use-checkout-flow.ts`, change:

```ts
import { ... } from "@/lib/checkout-flow";
```

to:

```ts
import { ... } from "@dynamic-demos/checkouts-widget/checkout-flow";
```

Search & replace other `@/lib/checkout-flow` references throughout `apps/checkouts/`:

```bash
grep -rln "@/lib/checkout-flow" apps/checkouts/
```

For each hit, swap to `@dynamic-demos/checkouts-widget/checkout-flow`.

- [ ] **Step 5: Install + run tests**

```bash
pnpm install
pnpm --filter @dynamic-demos/checkouts-widget test
pnpm --filter @dynamic-demos/checkouts checkouts typecheck test
```

Expected: 20 tests in the package (5 wrappers + 15 status-map), all passing. App typechecks. App tests (~4 use-checkout-flow tests) still pass — they still import from `@/lib/checkout-flow` indirectly via use-checkout-flow.ts, which now points at the package.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(checkouts-widget): move checkout-flow library + tests into the package"
```

---

## Task 3: Move `use-checkout-flow` hook + decouple env

**Files:**
- Move: `apps/checkouts/hooks/use-checkout-flow.ts` → `packages/checkouts-widget/src/hooks/use-checkout-flow.ts`
- Move: `apps/checkouts/__tests__/use-checkout-flow.test.ts` → `packages/checkouts-widget/__tests__/use-checkout-flow.test.ts`
- Modify: `apps/checkouts/components/payment-widget/use-payment-actions.ts` (import path + storageNamespace prop)
- Modify: `packages/checkouts-widget/src/index.ts` (re-export the hook)

- [ ] **Step 1: Move source + test**

```bash
mkdir -p packages/checkouts-widget/src/hooks
git mv apps/checkouts/hooks/use-checkout-flow.ts                packages/checkouts-widget/src/hooks/use-checkout-flow.ts
git mv apps/checkouts/__tests__/use-checkout-flow.test.ts       packages/checkouts-widget/__tests__/use-checkout-flow.test.ts
```

- [ ] **Step 2: Decouple env coupling**

In `packages/checkouts-widget/src/hooks/use-checkout-flow.ts`:

Replace:

```ts
import { env } from "@/lib/env";
// ...
const storage = useMemo(
  () => createCheckoutStorage(env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID),
  [],
);
```

with:

```ts
// ...
export interface UseCheckoutFlowOptions {
  /** Namespace for localStorage persistence. Defaults to "default". Host apps that
   *  support multiple Dynamic environments should pass their environment id here so
   *  in-flight transactions don't bleed across environments. */
  storageNamespace?: string;
}

export function useCheckoutFlow(
  options: UseCheckoutFlowOptions = {},
): UseCheckoutFlowReturn {
  const { storageNamespace = "default" } = options;
  // ...
  const storage = useMemo(
    () => createCheckoutStorage(storageNamespace),
    [storageNamespace],
  );
  // ...
}
```

Also change other imports inside the file:

- `import { ... } from "@/lib/checkout-flow"` → `import { ... } from "../checkout-flow"`
- `import type { WalletAccount } from "@/lib/dynamicClient"` → `import type { WalletAccount } from "@dynamic-labs-sdk/client"`
- `import type { ExecutionUpdate } from "@/lib/types"` → `import type { ExecutionUpdate } from "../lib/types"`
- `import { mapTransactionToUpdate } from "@/lib/checkout-flow/status-map"` → `import { mapTransactionToUpdate } from "../checkout-flow/status-map"`
- `import { createCheckoutStorage } from "@/lib/checkout-flow/storage"` → `import { createCheckoutStorage } from "../checkout-flow/storage"`
- `import { formatErrorMessage, isUserRejection } from "@/lib/format"` → temporarily inline these two helpers OR add a stub `src/lib/format.ts` with just these two (Task 4 fills the rest):

  Create `packages/checkouts-widget/src/lib/format.ts`:

  ```ts
  export function formatErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return "An unknown error occurred";
  }

  const REJECTION_PATTERNS = [
    /user rejected/i,
    /user denied/i,
    /rejected by user/i,
    /cancelled by user/i,
    /user cancelled/i,
  ];

  export function isUserRejection(err: unknown): boolean {
    const message = err instanceof Error ? err.message : String(err);
    return REJECTION_PATTERNS.some((p) => p.test(message));
  }
  ```

  Then change the import:

  ```ts
  import { formatErrorMessage, isUserRejection } from "../lib/format";
  ```

- [ ] **Step 3: Update test imports**

In `packages/checkouts-widget/__tests__/use-checkout-flow.test.ts`:

```ts
import * as cf from "@/checkout-flow";        // was "@/lib/checkout-flow"
import { useCheckoutFlow } from "@/hooks/use-checkout-flow";   // already correct
```

Add a new test asserting the `storageNamespace` prop:

```ts
it("uses storageNamespace prop for localStorage key", () => {
  const { result } = renderHook(() => useCheckoutFlow({ storageNamespace: "ns-x" }));
  // Hook didn't crash with custom namespace — storage helper handles the rest;
  // collision-prevention behavior is covered by storage.test.ts indirectly.
  expect(result.current).toBeDefined();
});
```

- [ ] **Step 3.5: Expose the final transaction from `submit()`**

Inside `use-checkout-flow.ts`, change `submit()`'s return type from `Promise<boolean>` to `Promise<CheckoutTransaction | null>`. After the polling loop, return `latest` on success, return `null` on rejection/error. Existing callers (`apps/checkouts/components/payment-widget/use-payment-actions.ts`) treat the return as truthy/falsy — `Promise<CheckoutTransaction | null>` keeps that semantics. Update the `UseCheckoutFlowReturn` interface accordingly:

```ts
export interface UseCheckoutFlowReturn {
  // ...existing fields...
  /** Submit the transaction and poll until terminal. Returns the final CheckoutTransaction on success, null on rejection / error. */
  submit: (params: SubmitParams) => Promise<CheckoutTransaction | null>;
  // ...
}
```

Update the existing test in `use-checkout-flow.test.ts` to assert the return value:

```ts
// inside the existing "calls submit, polls..." test
let result_: any;
await act(async () => {
  result_ = await result.current.submit({ /* ...same args... */ });
});
expect(result_).toBeTruthy();
expect(result_.settlementState).toBe("completed");
```

And in the error test, replace `expect(ok).toBe(false);` with `expect(ok).toBeNull();`.

- [ ] **Step 4: Re-export from the package**

In `packages/checkouts-widget/src/index.ts`:

```ts
export { useCheckoutFlow } from "./hooks/use-checkout-flow";
export type {
  UseCheckoutFlowReturn,
  UseCheckoutFlowOptions,
  BeginCheckoutParams,
  BeginCheckoutResult,
  SubmitParams,
} from "./hooks/use-checkout-flow";
```

- [ ] **Step 5: Update app import**

In `apps/checkouts/components/payment-widget/use-payment-actions.ts`:

```ts
import { useCheckoutFlow } from "@/hooks/use-checkout-flow";
```

becomes:

```ts
import { useCheckoutFlow } from "@dynamic-demos/checkouts-widget";

// ...inside the hook:
const checkoutFlow = useCheckoutFlow({
  storageNamespace: env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
});
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @dynamic-demos/checkouts-widget test
pnpm --filter checkouts typecheck test
```

Expected: 4 use-checkout-flow tests + the new namespace test pass in the package; app tests still green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(checkouts-widget): move use-checkout-flow hook into package + accept storageNamespace prop"
```

---

## Task 4: Consolidate shared lib (`format`, `chain`, `types`)

**Files:**
- Modify: `packages/checkouts-widget/src/lib/types.ts` (expand from Task 2 stub)
- Modify: `packages/checkouts-widget/src/lib/format.ts` (expand from Task 3 stub)
- Create: `packages/checkouts-widget/src/lib/chain.ts`
- Modify: `apps/checkouts/lib/format.ts` (re-export from package)
- Modify: `apps/checkouts/lib/types.ts` (drop widget-only types; re-export from package)
- Modify: `apps/checkouts/lib/widget-config.ts` (drop `isSolanaChainId`; re-export from package)
- Move: `packages/checkouts-widget/src/checkout-flow/types-local.ts` → deleted

- [ ] **Step 1: Expand `packages/checkouts-widget/src/lib/types.ts`**

Copy all WIDGET-relevant types from `apps/checkouts/lib/types.ts` (Token, ReviewQuote, ExecutionStatus, ExecutionUpdate). Add `BrandConfig`:

```ts
export interface Token {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
}

export type ExecutionStatus =
  | "PENDING"
  | "ACTION_REQUIRED"
  | "RUNNING"
  | "DONE"
  | "FAILED";

export interface ExecutionUpdate {
  stepIndex: number;
  totalSteps: number;
  processType?: string;
  status: ExecutionStatus;
  txHash?: string;
  isBridging?: boolean;
  isCrossChain?: boolean;
  lifiExplorerLink?: string;
}

export interface ReviewQuote {
  route: {
    fromAmount: string;
    toAmount: string;
    fromChainId: number;
    toChainId: number;
    fromToken: { address: string; chainId: number; symbol: string; decimals: number };
    toToken: { address: string; chainId: number; symbol: string; decimals: number };
    steps: Array<{ type?: string }>;
  };
  fromToken: { address: string; chainId: number; symbol: string; decimals: number; name?: string; logoURI?: string };
  toToken: { address: string; chainId: number; symbol: string; decimals: number; name?: string; logoURI?: string };
  fromAmount: string;
  toAmount: string;
  toAmountUsd: string;
  totalFeeUsd: string;
  integratorFeeUsd?: string;
  integrator?: string;
}

export interface BrandConfig {
  fg?: string;
  bg?: string;
  muted?: string;
  cardGradientStart?: string;
  cardGradientEnd?: string;
  radius?: string;
  logoUrl?: string;
}
```

- [ ] **Step 2: Delete the temp shim**

```bash
rm packages/checkouts-widget/src/checkout-flow/types-local.ts
```

Update `status-map.ts` import:

```ts
import type { ExecutionUpdate } from "./types-local";
```

becomes:

```ts
import type { ExecutionUpdate } from "../lib/types";
```

- [ ] **Step 3: Expand `packages/checkouts-widget/src/lib/format.ts`**

Replace the stub with the full file contents from `apps/checkouts/lib/format.ts` (all of `formatRawTokenAmount`, `formatUsd`, `formatApproxUsd`, `parseUsd`, `formatTokenAmount`, `formatTokenBalance`, `formatAddress`, `formatErrorMessage`, `isUserRejection`).

- [ ] **Step 4: Create `packages/checkouts-widget/src/lib/chain.ts`**

Move `isSolanaChainId` (and any other widget-relevant chain helpers) from `apps/checkouts/lib/widget-config.ts`. Keep app-config helpers (WidgetConfig types tied to demo config) in `apps/checkouts/lib/widget-config.ts`.

Content for `chain.ts`:

```ts
/** Dynamic's network id for Solana — bare chain id, not CAIP-2. */
export const DYNAMIC_SOLANA_NETWORK_ID = 101;

export function isSolanaChainId(chainId: number): boolean {
  return chainId === DYNAMIC_SOLANA_NETWORK_ID;
}
```

- [ ] **Step 5: Update `packages/checkouts-widget/src/index.ts`**

Add type + util re-exports:

```ts
export { useCheckoutFlow } from "./hooks/use-checkout-flow";
export type {
  UseCheckoutFlowReturn,
  UseCheckoutFlowOptions,
  BeginCheckoutParams,
  BeginCheckoutResult,
  SubmitParams,
} from "./hooks/use-checkout-flow";

export type {
  Token,
  ExecutionStatus,
  ExecutionUpdate,
  ReviewQuote,
  BrandConfig,
} from "./lib/types";

export {
  formatRawTokenAmount,
  formatUsd,
  formatApproxUsd,
  parseUsd,
  formatTokenAmount,
  formatTokenBalance,
  formatAddress,
  formatErrorMessage,
  isUserRejection,
} from "./lib/format";

export { isSolanaChainId } from "./lib/chain";
```

- [ ] **Step 6: Make `apps/checkouts/lib/{types,format,widget-config}.ts` re-export from the package**

`apps/checkouts/lib/types.ts` keeps only app-level types (`Transaction`, `Status`, `TransactionStatus`, `StoredCheckoutConfig`, `ApiResponse`, `InitializeTransactionParams`, `UpdateTransactionParams`). Drop the rest. Re-export from package at the top:

```ts
export type {
  Token,
  ExecutionStatus,
  ExecutionUpdate,
  ReviewQuote,
} from "@dynamic-demos/checkouts-widget";
// ...rest of file (Transaction, Status, etc.)
```

`apps/checkouts/lib/format.ts`: replace entire content with:

```ts
export {
  formatRawTokenAmount,
  formatUsd,
  formatApproxUsd,
  parseUsd,
  formatTokenAmount,
  formatTokenBalance,
  formatAddress,
  formatErrorMessage,
  isUserRejection,
} from "@dynamic-demos/checkouts-widget";
```

`apps/checkouts/lib/widget-config.ts`: drop the `isSolanaChainId` definition; re-export from package:

```ts
export { isSolanaChainId } from "@dynamic-demos/checkouts-widget";
// ...rest of file
```

- [ ] **Step 7: Run tests**

```bash
pnpm --filter @dynamic-demos/checkouts-widget test
pnpm --filter checkouts typecheck test
```

Expected: all 20+ package tests pass; app typechecks; app tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(checkouts-widget): consolidate shared types, formatting, chain helpers"
```

---

## Task 5: Move payment-modal + screens components into the package

**Files:**
- Move: `apps/checkouts/components/payment-modal/deposit-amount-screen.tsx` → `packages/checkouts-widget/src/components/deposit-amount-screen.tsx`
- Move: `apps/checkouts/components/payment-modal/review-payment-screen.tsx` → `packages/checkouts-widget/src/components/review-payment-screen.tsx`
- Move: `apps/checkouts/components/payment-modal/transaction-progress-screen.tsx` → `packages/checkouts-widget/src/components/transaction-progress-screen.tsx`
- Move: `apps/checkouts/components/payment-modal/token-conversion-card.tsx` → `packages/checkouts-widget/src/components/token-conversion-card.tsx`
- Move: `apps/checkouts/components/payment-modal/screen-header.tsx` → `packages/checkouts-widget/src/components/screen-header.tsx`
- Move: `apps/checkouts/components/payment-modal/info-box.tsx` → `packages/checkouts-widget/src/components/info-box.tsx`
- Move: `apps/checkouts/components/payment-modal/error-banner.tsx` → `packages/checkouts-widget/src/components/error-banner.tsx`
- Move: `apps/checkouts/components/payment-widget/screens/review-screen.tsx` → `packages/checkouts-widget/src/components/review-wrapper.tsx`
- Move: `apps/checkouts/components/payment-widget/screens/processing-screen.tsx` → `packages/checkouts-widget/src/components/processing-wrapper.tsx`
- Move: `apps/checkouts/components/icons.tsx` (relevant subset) → `packages/checkouts-widget/src/components/icons.tsx`
- Modify: many `apps/checkouts/` imports

- [ ] **Step 1: Move the leaf screens (no inter-file dependencies first)**

```bash
mkdir -p packages/checkouts-widget/src/components
git mv apps/checkouts/components/payment-modal/screen-header.tsx           packages/checkouts-widget/src/components/screen-header.tsx
git mv apps/checkouts/components/payment-modal/info-box.tsx                packages/checkouts-widget/src/components/info-box.tsx
git mv apps/checkouts/components/payment-modal/error-banner.tsx            packages/checkouts-widget/src/components/error-banner.tsx
git mv apps/checkouts/components/payment-modal/token-conversion-card.tsx   packages/checkouts-widget/src/components/token-conversion-card.tsx
```

- [ ] **Step 2: Move icons (widget subset only)**

Open `apps/checkouts/components/icons.tsx`. Identify which icons the moved screens use (`ArrowRightIcon` is one — used by `token-conversion-card`). Copy those icons into `packages/checkouts-widget/src/components/icons.tsx`. Leave the rest in the app's `icons.tsx`.

If unsure, copy the entire file:

```bash
cp apps/checkouts/components/icons.tsx packages/checkouts-widget/src/components/icons.tsx
```

…and trim unused icons in a follow-up.

- [ ] **Step 3: Update imports in moved screens**

For each moved file, rewrite imports:

- `@dynamic-demos/utils` stays
- `@dynamic-demos/ui` stays
- `@dynamic-labs/iconic` stays
- `@/components/icons` → `./icons`
- `@/lib/format` → `../lib/format`
- `@/lib/types` → `../lib/types`
- `@/lib/widget-config` → `../lib/chain` (for `isSolanaChainId`)

Also update `apps/checkouts/` files that referenced the moved components:

```bash
grep -rln "@/components/payment-modal/screen-header\|@/components/payment-modal/info-box\|@/components/payment-modal/error-banner\|@/components/payment-modal/token-conversion-card" apps/checkouts/
```

Rewrite each hit to import from `@dynamic-demos/checkouts-widget` (but only after the package re-exports them — see Step 6).

- [ ] **Step 4: Move the deposit-amount-screen + review-payment-screen + transaction-progress-screen**

```bash
git mv apps/checkouts/components/payment-modal/deposit-amount-screen.tsx       packages/checkouts-widget/src/components/deposit-amount-screen.tsx
git mv apps/checkouts/components/payment-modal/review-payment-screen.tsx       packages/checkouts-widget/src/components/review-payment-screen.tsx
git mv apps/checkouts/components/payment-modal/transaction-progress-screen.tsx packages/checkouts-widget/src/components/transaction-progress-screen.tsx
```

Each file: rewrite imports the same way (Step 3 patterns).

- [ ] **Step 5: Move the wrappers (review-screen.tsx, processing-screen.tsx)**

These are the wrappers under `components/payment-widget/screens/` that take props from `index.tsx` and render the leaf screens. Move them into the package and rename to avoid the `-screen` vs `-screen-wrapper` ambiguity:

```bash
git mv apps/checkouts/components/payment-widget/screens/review-screen.tsx     packages/checkouts-widget/src/components/review-wrapper.tsx
git mv apps/checkouts/components/payment-widget/screens/processing-screen.tsx packages/checkouts-widget/src/components/processing-wrapper.tsx
```

Update their imports + update callers in `apps/checkouts/components/payment-widget/index.tsx`. Leave `pending-screen.tsx` and `completion-screen.tsx` in the app for now — Task 6 reconsiders the screen state machine.

- [ ] **Step 6: Re-export from package**

In `packages/checkouts-widget/src/index.ts` append:

```ts
export { default as DepositAmountScreen } from "./components/deposit-amount-screen";
export { default as ReviewPaymentScreen } from "./components/review-payment-screen";
export { default as TransactionProgressScreen } from "./components/transaction-progress-screen";
export { default as TokenConversionCard } from "./components/token-conversion-card";
export { default as ScreenHeader } from "./components/screen-header";
export { default as InfoBox } from "./components/info-box";
export { default as ErrorBanner } from "./components/error-banner";
```

…and rewrite `apps/checkouts/` import sites accordingly.

- [ ] **Step 7: Run tests + typecheck**

```bash
pnpm --filter @dynamic-demos/checkouts-widget typecheck test
pnpm --filter checkouts typecheck test
```

Expected: package typechecks (no test changes — all moved screens are visual; no unit tests exist for them today); app still passes.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(checkouts-widget): move payment-modal screens + wrappers into the package"
```

---

## Task 6: Build `<PaymentWidget />`

**Files:**
- Create: `packages/checkouts-widget/src/PaymentWidget.tsx`
- Modify: `packages/checkouts-widget/src/index.ts`
- Create: `packages/checkouts-widget/__tests__/PaymentWidget.smoke.test.tsx`

- [ ] **Step 1: Write the failing smoke test**

Create `packages/checkouts-widget/__tests__/PaymentWidget.smoke.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/checkout-flow", () => ({
  createTransaction: vi.fn(),
  attachWalletSource: vi.fn(),
  getQuote: vi.fn(),
  getTransaction: vi.fn(),
  submit: vi.fn(),
  cancel: vi.fn(),
}));

import { PaymentWidget } from "@/PaymentWidget";

const requiredProps = {
  checkoutId: "ck_test",
  walletAccount: { address: "0xtest" } as any,
  currency: "USD",
  destinationAddress: "0xdest",
  destinationChain: "ETH" as any,
  fromToken: {
    address: "0xtoken",
    chainId: 1,
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
  },
  destinationToken: {
    address: "0xdesttoken",
    chainId: 1,
    symbol: "USDT",
    decimals: 6,
    name: "Tether",
  },
  needsConversion: true,
  isCrossChain: false,
};

describe("PaymentWidget", () => {
  it("renders the amount picker when `amount` is not supplied", () => {
    render(<PaymentWidget {...requiredProps} />);
    expect(screen.getByText(/amount/i)).toBeDefined();
  });

  it("skips the amount picker when `amount` is supplied", () => {
    render(<PaymentWidget {...requiredProps} amount="100.00" />);
    // Review screen renders the conversion card with USDC + dest token symbol
    expect(screen.getByText(/USDC/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test (should fail)**

```bash
pnpm --filter @dynamic-demos/checkouts-widget test PaymentWidget.smoke
```

Expected: FAIL — `PaymentWidget` not found.

- [ ] **Step 3: Implement `PaymentWidget.tsx`**

Create `packages/checkouts-widget/src/PaymentWidget.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { useCheckoutFlow } from "./hooks/use-checkout-flow";
import DepositAmountScreen from "./components/deposit-amount-screen";
import ReviewPaymentScreen from "./components/review-payment-screen";
import TransactionProgressScreen from "./components/transaction-progress-screen";
import { formatRawTokenAmount } from "./lib/format";
import type {
  BrandConfig,
  ExecutionUpdate,
  ReviewQuote,
  Token,
} from "./lib/types";
import type { CheckoutTransaction } from "./checkout-flow";

export interface PaymentWidgetProps {
  // Required
  checkoutId: string;
  walletAccount: WalletAccount;
  currency: string;
  destinationAddress: string;
  destinationChain: string;
  fromToken: Token;
  /** Destination token metadata — needed for the review-screen conversion card + amount formatting. */
  destinationToken: Token;
  /** Whether the source token differs from the destination token (drives the swap step). Host computes from fromToken vs destinationToken. */
  needsConversion: boolean;
  /** Whether the source chain differs from the destination chain (drives the bridge step). Host computes from fromToken.chainId vs destinationToken.chainId. */
  isCrossChain: boolean;

  // Optional
  amount?: string;
  presetAmounts?: number[];
  brand?: BrandConfig;
  memo?: Record<string, unknown>;
  storageNamespace?: string;

  // Callbacks
  onAmountSelected?: (amount: string) => void;
  onTransactionCreated?: (tx: CheckoutTransaction) => void;
  onQuoteLocked?: (quote: ReviewQuote) => void;
  onExecutionUpdate?: (update: ExecutionUpdate) => void;
  onSettlementCompleted?: (tx: CheckoutTransaction) => void;
  onCancelled?: () => void;
  onError?: (err: Error) => void;
}

type Stage = "amount" | "review" | "processing" | "done";

export function PaymentWidget(props: PaymentWidgetProps): JSX.Element {
  const {
    checkoutId,
    walletAccount,
    currency,
    destinationAddress,
    destinationChain,
    fromToken,
    destinationToken,
    needsConversion,
    isCrossChain,
    amount: amountProp,
    presetAmounts = [5, 50, 100, 500],
    brand,
    memo,
    storageNamespace,
    onAmountSelected,
    onTransactionCreated,
    onQuoteLocked,
    onExecutionUpdate,
    onSettlementCompleted,
    onCancelled,
    onError,
  } = props;

  const [stage, setStage] = useState<Stage>(amountProp ? "review" : "amount");
  const [amount, setAmount] = useState<string>(amountProp ?? "");
  const [executionUpdate, setExecutionUpdate] = useState<ExecutionUpdate | null>(null);

  const flow = useCheckoutFlow({ storageNamespace });

  // Derive the ReviewQuote (UI shape) from the latest CheckoutTransaction snapshot.
  // This mirrors apps/checkouts/components/payment-widget/use-payment-actions.ts's
  // `reviewQuote` memo — see that file for the canonical adapter pattern.
  const reviewQuote = useMemo((): ReviewQuote | null => {
    const tx = flow.quote;
    if (!tx?.quote) return null;
    const q = tx.quote;
    type RawStepToken = { logoURI?: string; name?: string };
    const rawStep = (q.rawQuote as { steps?: { fromToken?: RawStepToken; toToken?: RawStepToken }[] } | undefined)?.steps?.[0];
    const fromAmount = formatRawTokenAmount(q.fromAmount, fromToken.decimals);
    const toAmount = formatRawTokenAmount(q.toAmount, destinationToken.decimals);
    return {
      route: {} as ReviewQuote["route"],
      fromToken: { ...fromToken, name: rawStep?.fromToken?.name ?? fromToken.name, logoURI: rawStep?.fromToken?.logoURI ?? fromToken.logoURI },
      toToken: { ...destinationToken, name: rawStep?.toToken?.name ?? destinationToken.name, logoURI: rawStep?.toToken?.logoURI ?? destinationToken.logoURI },
      fromAmount,
      toAmount,
      toAmountUsd: toAmount,
      totalFeeUsd: q.fees?.totalFeeUsd ?? "0",
    };
  }, [flow.quote, fromToken, destinationToken]);

  // Begin checkout when entering review stage
  useEffect(() => {
    if (stage !== "review") return;
    let cancelled = false;
    (async () => {
      try {
        const result = await flow.beginCheckout({
          amount,
          currency,
          checkoutId,
          destinationAddresses: [{ address: destinationAddress, chain: destinationChain as any }],
          memo,
          source: {
            fromAddress: walletAccount.address,
            fromChainId: String(fromToken.chainId),
            fromChainName: destinationChain as any,
          },
          fromTokenAddress: fromToken.address,
        });
        if (cancelled || !result) return;
        onTransactionCreated?.(result.transaction);
      } catch (err) {
        if (!cancelled) onError?.(err as Error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stage, amount, currency, checkoutId, destinationAddress, destinationChain, fromToken, walletAccount.address, memo, flow, onTransactionCreated, onError]);

  // Fire onQuoteLocked once when the derived reviewQuote first becomes available.
  const lockedFiredRef = useRef(false);
  useEffect(() => {
    if (reviewQuote && !lockedFiredRef.current) {
      lockedFiredRef.current = true;
      onQuoteLocked?.(reviewQuote);
    }
  }, [reviewQuote, onQuoteLocked]);

  const handleAmountSubmit = useCallback((next: string) => {
    setAmount(next);
    onAmountSelected?.(next);
    setStage("review");
  }, [onAmountSelected]);

  const handleReviewConfirm = useCallback(async () => {
    setStage("processing");
    const totalSteps = needsConversion ? (isCrossChain ? 3 : 2) : 1;
    const finalTx = await flow.submit({
      walletAccount,
      needsConversion,
      totalSteps,
      isCrossChain,
      onUpdate: (update) => {
        setExecutionUpdate(update);
        onExecutionUpdate?.(update);
      },
      onRejected: () => {
        setStage("review");
        onCancelled?.();
      },
      onError: () => onError?.(new Error(flow.error ?? "Submit failed")),
    });
    if (finalTx) {
      setStage("done");
      onSettlementCompleted?.(finalTx);
    }
  }, [flow, walletAccount, needsConversion, isCrossChain, onExecutionUpdate, onCancelled, onError, onSettlementCompleted]);

  const handleCancel = useCallback(async () => {
    await flow.cancel();
    onCancelled?.();
  }, [flow, onCancelled]);

  const brandStyle: React.CSSProperties = brand
    ? {
        ["--brand-fg" as any]: brand.fg,
        ["--brand-muted" as any]: brand.muted,
        ["--brand-card-gradient-start" as any]: brand.cardGradientStart,
        ["--brand-card-gradient-end" as any]: brand.cardGradientEnd,
        ["--brand-radius" as any]: brand.radius,
      }
    : {};

  return (
    <div className="checkouts-widget-root" style={brandStyle}>
      {stage === "amount" && (
        <DepositAmountScreen
          presetAmounts={presetAmounts}
          onSubmit={handleAmountSubmit}
        />
      )}
      {stage === "review" && reviewQuote && (
        <ReviewPaymentScreen
          quote={reviewQuote}
          fromToken={fromToken}
          onConfirm={handleReviewConfirm}
          onBack={handleCancel}
        />
      )}
      {(stage === "processing" || stage === "done") && (
        <TransactionProgressScreen
          executionUpdate={executionUpdate}
        />
      )}
    </div>
  );
}
```

> **Note:** The props passed to `DepositAmountScreen`, `ReviewPaymentScreen`, and `TransactionProgressScreen` must match the actual signatures of the files moved in Task 5. The implementer must read those files (now in `packages/checkouts-widget/src/components/`) and adjust the prop wiring to match — this skeleton is intentionally rough on the prop-binding because the screen prop contracts were inherited verbatim from app code; reconciliation happens during implementation. The state machine itself (`amount → review → processing → done`) and the callback firing points are firm.

- [ ] **Step 4: Run smoke test (should pass)**

```bash
pnpm --filter @dynamic-demos/checkouts-widget test PaymentWidget.smoke
```

Expected: both smoke tests pass.

- [ ] **Step 5: Export from `index.ts`**

In `packages/checkouts-widget/src/index.ts` append:

```ts
export { PaymentWidget } from "./PaymentWidget";
export type { PaymentWidgetProps } from "./PaymentWidget";
```

- [ ] **Step 6: Run full package test suite**

```bash
pnpm --filter @dynamic-demos/checkouts-widget test
```

Expected: all tests pass (20+ from earlier + 2 smoke).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(checkouts-widget): add <PaymentWidget /> top-level component with internal amount→review→processing state machine"
```

---

## Task 7: Refactor `apps/checkouts/` to consume `<PaymentWidget />`

**Files:**
- Modify: `apps/checkouts/components/payment-widget/index.tsx`
- Modify: `apps/checkouts/components/payment-widget/use-payment-actions.ts` (remove duplicated logic now in PaymentWidget)
- Modify: `apps/checkouts/components/payment-widget/use-payment-execution.ts` (same)

- [ ] **Step 1: Identify the render branches**

Open `apps/checkouts/components/payment-widget/index.tsx`. Locate where it currently routes between deposit-amount-screen, review-screen, processing-screen. Note the props passed to each.

- [ ] **Step 2: Replace those branches with `<PaymentWidget />`**

When the user has selected a wallet account and source token (i.e., the current "deposit-amount" / "review" / "processing" stages), mount `<PaymentWidget />` from the package and let it drive the rest. Pass the dashboard-mirror callbacks via props:

```tsx
import { PaymentWidget } from "@dynamic-demos/checkouts-widget";
import { env } from "@/lib/env";
import { initializeTransaction, updateTransaction, completeTransaction, failTransaction, cancelTransaction } from "@/lib/api/transactions";

// ...

if (currentScreen === "deposit-amount" || currentScreen === "review" || currentScreen === "processing") {
  // Derive widget-required flags from app state. Both `selectedToken` and the
  // destination token come from the resolved widgetConfig.settlement; the host
  // already has the data the widget needs.
  const destinationToken: Token = {
    address: widgetConfig.settlement.tokenAddress,
    chainId: widgetConfig.settlement.chainId,
    symbol: widgetConfig.settlement.tokenSymbol,
    decimals: widgetConfig.settlement.decimals,
    name: widgetConfig.settlement.tokenSymbol,
  };
  const needsConversion = selectedToken.tokenAddress.toLowerCase() !== destinationToken.address.toLowerCase();
  const isCrossChain = selectedToken.chainId !== destinationToken.chainId;
  const fromToken: Token = {
    address: selectedToken.tokenAddress,
    chainId: selectedToken.chainId,
    symbol: selectedToken.symbol,
    decimals: selectedToken.decimals,
    name: selectedToken.name ?? selectedToken.symbol,
    logoURI: selectedToken.iconUrl,
  };

  return (
    <PaymentWidget
      checkoutId={env.NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID}
      walletAccount={selectedWalletAccount}
      currency={widgetConfig.currency}
      destinationAddress={widgetConfig.destinationAddress}
      destinationChain={widgetConfig.destinationChain}
      fromToken={fromToken}
      destinationToken={destinationToken}
      needsConversion={needsConversion}
      isCrossChain={isCrossChain}
      storageNamespace={env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID}
      memo={memo}
      brand={brand}
      onAmountSelected={(amt) => setAmount(amt)}
      onTransactionCreated={(tx) => initializeTransaction(tx)}
      onQuoteLocked={(q) => updateTransaction({ /* shape from existing use-payment-execution.ts call */ })}
      onSettlementCompleted={(tx) => completeTransaction(tx)}
      onCancelled={() => cancelTransaction(/* args from existing call */)}
      onError={(err) => failTransaction(/* args from existing call */)}
    />
  );
}
```

The exact shape of the API helper calls is whatever's already in `use-payment-execution.ts` — copy them verbatim into the callbacks.

- [ ] **Step 3: Trim `use-payment-actions.ts` + `use-payment-execution.ts`**

These hooks previously owned the begin/submit lifecycle. Now `PaymentWidget` owns it. Either:
- Delete them entirely if no other consumer remains, OR
- Keep them as thin wrappers that the index.tsx uses for non-wallet flows (Kraken).

Safe path: leave them for Kraken; remove just the wallet-specific branches that are now in the package.

- [ ] **Step 4: Run full pre-PR check**

```bash
pnpm turbo typecheck lint test
```

Expected: all green. If lint flags unused imports in the trimmed app files, remove them.

- [ ] **Step 5: Manual browser smoke**

```bash
pnpm --filter checkouts dev
```

Open `localhost:4001/?theme=cmpc7vdry000412mn2z3r01ty`. Verify:
1. Theme loads (Task 0 already fixed the env var).
2. Connect wallet → asset selector → amount picker (rendered by the package now) → review → submit → done.
3. Callbacks fire — confirm by `console.log` in each callback during testing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(checkouts): apps/checkouts mounts <PaymentWidget /> from @dynamic-demos/checkouts-widget for the wallet flow"
```

---

## Task 8: Update AGENTS.md files

**Files:**
- Modify: `packages/checkouts-widget/AGENTS.md` (expand the scaffold from Task 1)
- Modify: `apps/checkouts/AGENTS.md` (note the new dependency + behavior split)

- [ ] **Step 1: Expand `packages/checkouts-widget/AGENTS.md`**

Use the monorepo's `docs/templates/AGENTS.template.md` as a base. Cover: purpose, public surface, consumed env (none), peer deps, host responsibilities (Dynamic provider mount), brand-variable contract, lifecycle-callback contract, test commands.

- [ ] **Step 2: Update `apps/checkouts/AGENTS.md`**

Add a paragraph under "Architecture": "Wallet-source widget rendering (amount picker, review, processing) is delegated to `@dynamic-demos/checkouts-widget`. This app owns: page chrome, auth flow, wallet/asset selection, Kraken exchange flow, dashboard-transaction mirror calls (wired via PaymentWidget's lifecycle callbacks)."

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs(checkouts-widget): document package + update apps/checkouts AGENTS.md"
```

---

## Task 9: Final pre-PR check

- [ ] **Step 1: Full check from repo root**

```bash
pnpm turbo typecheck lint test
```

Expected: all green across the workspace.

- [ ] **Step 2: Verify no forbidden imports**

```bash
grep -rln "from \"next\|@t3-oss/env-nextjs\|@/lib/env\|@/lib/api\|@/lib/exchanges" packages/checkouts-widget/src/ || echo "clean"
```

Expected: prints "clean".

- [ ] **Step 3: Verify package contents**

```bash
ls packages/checkouts-widget/src/
ls packages/checkouts-widget/__tests__/
```

Confirm structure matches the "File structure (target end state)" section at the top of this plan.

- [ ] **Step 4: Browser smoke (final)**

Same as Task 7 Step 5 — run through one full wallet-source checkout and verify all callbacks fire.

- [ ] **Step 5: Commit + checkpoint**

```bash
git tag -a checkpoint/post-widget-package -m "Checkpoint after extracting packages/checkouts-widget. Wallet flow rendered by the package; apps/checkouts/ is a thin consumer."
```

---

## Self-review checklist

After completing all tasks, verify against the spec's acceptance criteria:

- [ ] `packages/checkouts-widget/` exists; `pnpm --filter @dynamic-demos/checkouts-widget test` passes.
- [ ] `apps/checkouts/` builds, typechecks, lints, tests with no behavior change.
- [ ] `apps/checkouts/components/payment-widget/index.tsx` mounts `<PaymentWidget />` instead of rendering deposit-amount/review/processing screens itself.
- [ ] No file in `packages/checkouts-widget/src/` imports from `next`, `@t3-oss/env-nextjs`, `@/lib/env`, `@/lib/api`, or `@/lib/exchanges`.
- [ ] Manual smoke: all lifecycle callbacks fire at least once during a wallet checkout.
- [ ] AGENTS.md files updated in both the new package and `apps/checkouts/`.
