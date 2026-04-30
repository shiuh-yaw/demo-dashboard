# Phase 1E — Transactions state machine package

> **Self-contained agent prompt.** Read this file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`.

---

## Your role

Create `packages/transactions` — the canonical state machine for "money in flight" lifecycle. Replaces ad-hoc state handling in dashboard, cross-border-ap-ar, proceeds, and other apps.

Ships as **one logical PR**.

## Wave + dependencies

- Wave 2.
- Depends on Phase 0.5.
- Parallelizable with 1A, 1B, 2-scaffold.
- Blocks: provider state-mapping (1A, 1B can stub if 1E pending — they wire real mappings once 1E is merged), webhook router (Phase 5A), dashboard transaction model migration (Phase 2).

## Skills

1. `superpowers:using-git-worktrees` — `.worktrees/phase-1e-transactions`, branch `phase/01e-transactions`.
2. `superpowers:writing-plans`.
3. `superpowers:test-driven-development` — every legal/illegal transition is a test.
4. `superpowers:verification-before-completion`.
5. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch (its `lib/types/order-state.ts` stays as-is, by exception).
- All transition assignments through helpers — no raw `state = "..."`.
- Helpers throw on illegal transitions at runtime.

## Required reading

- `apps/dashboard/src/lib/types/dashboard.ts` — current state machine definition.
- `apps/cross-border-ap-ar/lib/mock-data.ts` — disbursement state usage.
- `apps/proceeds/lib/fireblocks-pending.ts` — Fireblocks order status mapping.
- `apps/spark26/lib/types/order-state.ts` — for awareness; do **not** modify or migrate.
- `DECISIONS.md` D-010, D-006.

## What needs to happen

### 1. Scaffold `packages/transactions`

```
packages/transactions/
  package.json
  tsconfig.json
  src/
    index.ts
    state.ts           # TransactionState enum + LegalTransitions table
    machine.ts         # transition helpers
    validators.ts      # assertValidTransition, isTerminal, etc.
    types.ts           # Transaction interface, refs
    __tests__/
      state.test.ts
      machine.test.ts
      validators.test.ts
  AGENTS.md            # stub if Phase 3 not yet run
  package.json
```

### 2. `state.ts`

```ts
export const TransactionState = {
  initialized: 'initialized',
  draft: 'draft',
  submitted: 'submitted',
  pending: 'pending',
  confirmed: 'confirmed',
  // terminal
  expired: 'expired',
  abandoned: 'abandoned',
  failed: 'failed',
  cancelled: 'cancelled',
} as const;
export type TransactionState = typeof TransactionState[keyof typeof TransactionState];

export const LegalTransitions: Record<TransactionState, TransactionState[]> = {
  initialized: ['draft', 'expired', 'cancelled'],
  draft: ['submitted', 'abandoned', 'cancelled'],
  submitted: ['pending', 'failed', 'cancelled'],
  pending: ['confirmed', 'failed'],
  confirmed: [],
  expired: [],
  abandoned: [],
  failed: [],
  cancelled: [],
};

export const TerminalStates: ReadonlySet<TransactionState> = new Set([
  'confirmed', 'expired', 'abandoned', 'failed', 'cancelled',
]);
```

### 3. `validators.ts`

```ts
export class IllegalTransitionError extends Error {
  constructor(public from: TransactionState, public to: TransactionState) {
    super(`Illegal transition: ${from} → ${to}`);
  }
}

export function assertValidTransition(from: TransactionState, to: TransactionState): void {
  if (!LegalTransitions[from].includes(to)) {
    throw new IllegalTransitionError(from, to);
  }
}

export function isTerminal(s: TransactionState): boolean {
  return TerminalStates.has(s);
}
```

### 4. `machine.ts`

```ts
export interface TransitionContext {
  reason?: string;
  metadata?: Record<string, unknown>;
}

export function submit<T extends { state: TransactionState }>(t: T, ctx?: TransitionContext): T & { state: 'submitted' } {
  assertValidTransition(t.state, 'submitted');
  return { ...t, state: 'submitted' };
}

export function pending<T extends { state: TransactionState }>(t: T, ctx?: TransitionContext): T & { state: 'pending' } {
  assertValidTransition(t.state, 'pending');
  return { ...t, state: 'pending' };
}

export function confirm<T extends { state: TransactionState }>(t: T, ctx?: TransitionContext): T & { state: 'confirmed' } {
  assertValidTransition(t.state, 'confirmed');
  return { ...t, state: 'confirmed' };
}

// And: fail, cancel, expire, abandon, draft
```

Each helper:
- Validates the transition.
- Returns a new object (immutable).
- Optionally accepts a `TransitionContext` for reason/metadata logging by the caller.

### 5. `types.ts`

```ts
export interface TransactionRefs {
  demoInstanceId?: string;
  brandId?: string;
  parentTransactionId?: string;  // for sandwich legs
}

export interface Transaction<TKind extends string = string, TPayload = unknown> {
  id: string;
  kind: TKind;
  state: TransactionState;
  refs: TransactionRefs;
  payload: TPayload;
  createdAt: string;
  updatedAt: string;
}
```

`TKind` extensibility: demos can subtype (`'disbursement' | 'payout' | 'swap' | 'checkout' | ...`). State values are always canonical.

### 6. Tests

- Every legal transition succeeds.
- Every illegal transition throws `IllegalTransitionError`.
- Terminal states accept no transitions (assert that for each terminal).
- `isTerminal` returns true for all five terminal states, false for others.
- Helpers preserve unrelated fields and return new objects (immutability).

### 7. AGENTS.md stub

Minimal stub at `packages/transactions/AGENTS.md`:

```markdown
---
name: transactions
kind: package
flow_role: utility
custody: n/a
status: stable
---

# Transactions

Canonical state machine for the "money in flight" lifecycle. See `DECISIONS.md` D-010.

> Authoritative content lands in Phase 3 AGENTS.md authoring. This is a stub.
```

### 8. Wire dashboard's existing transaction types

In `apps/dashboard/src/lib/types/dashboard.ts`:
- Replace the inline state enum with `import { TransactionState } from '@dynamic-demos/transactions'`.
- Re-export with same names if any consumer relies on the old export path (back-compat).
- Keep dashboard-specific transaction types (e.g., `DashboardTransaction extends Transaction<'checkout', CheckoutPayload>`).

Verify nothing breaks: `pnpm turbo typecheck && pnpm turbo build`.

## Acceptance criteria

- [ ] `packages/transactions` exists with state, machine, validators, types, tests.
- [ ] All transition helpers throw on illegal transitions (verified by tests).
- [ ] Dashboard imports the package; legacy state enum re-exports for back-compat.
- [ ] `apps/spark26/` untouched.
- [ ] CI gates pass.

## Commit plan

1. `feat(transactions): scaffold package with state + transitions + types`
2. `feat(transactions): add validators and transition helpers`
3. `test(transactions): add full transition coverage`
4. `refactor(dashboard): consume @dynamic-demos/transactions`
5. `chore(transactions): add AGENTS.md stub`

## PR title

`feat(transactions): Phase 1E — canonical state machine package`

## PR description

```
## Phase 1E of demo meta-system

Promotes the dashboard's inline transaction state machine into `@dynamic-demos/transactions` so providers, apps, and the webhook router share one source of truth.

### What changed
- New `packages/transactions` with `TransactionState`, transition helpers (`submit`, `confirm`, `fail`, etc.), validators (throw on illegal transitions), types.
- Dashboard transaction types now import from the package.
- Tests cover every legal + illegal transition and terminal state behavior.

### Spark26
Untouched. Its `lib/types/order-state.ts` is preserved by exception (D-006). Documented in spark26's AGENTS.md (when Phase 3 lands).

### Downstream
Provider packages (Phase 1A, 1B) will import `TransactionState` for state-mapping. Webhook router (5A) uses transition helpers exclusively.

### References
- `DECISIONS.md` (D-010, D-006)
- Phase prompt: `docs/projects/demo-meta-system/phases/01e-transactions-package.md`
```

After merge, update `PROGRESS.md` row "1E. Transactions package" to `🟢 done`.
