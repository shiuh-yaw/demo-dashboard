# Extending the canonical state machine

This is the runbook for adding a new `TransactionState` value to `packages/transactions/src/state.ts`. It's a cross-cutting change: every provider's `state-mapping.ts`, every dashboard service that asserts transitions, and every test that enumerates states needs an update. Time budget: 2–4 hours.

> Decisions referenced: D-010 (`packages/transactions` owns the canonical state machine).

**Before starting:** confirm the new state cannot be expressed by composing existing states + metadata. The bar for new states is high — the machine has eleven of them already, and each one is a permanent contract.

---

## Prerequisites

1. You've drafted a D-NNN entry in `docs/projects/demo-meta-system/DECISIONS.md` proposing the new state, with rationale + the lifecycle position it occupies.
2. The new state has been reviewed by at least one other engineer (state machine changes are NOT a solo decision — `LegalTransitions` becomes a runtime invariant for every transaction the moment this lands).
3. You have a list of every existing provider whose `state-mapping.ts` will need to update. Run:
   ```bash
   grep -rln "rampStatusToCanonical\|stateMapping\|toCanonicalState" packages/*/src/
   ```

## Steps

### 1. Add the new state value

Edit `packages/transactions/src/state.ts`:

```ts
export const TransactionState = {
  // ... existing values
  '<new-state>': '<new-state>',
} as const;
```

Add the state to the doc comment lifecycle diagram at the top of the file. If the state is terminal, add it to `TerminalStates`.

### 2. Update `LegalTransitions`

Add the new state as a key (required — every `TransactionState` MUST appear as a key per the invariant) and update the entries of any predecessor states to include it as a legal next-state:

```ts
export const LegalTransitions: Record<TransactionState, TransactionState[]> = {
  // ...
  '<predecessor>': [...existing, '<new-state>'],
  '<new-state>': [...successors],
  // ...
};
```

Be conservative on successors. Each entry is a runtime-enforced edge — adding `failed` later is cheap, removing edges is breaking.

### 3. Update `assertValidTransition` tests

`packages/transactions/src/__tests__/machine.test.ts` enumerates every transition. Add:

- One test for each new legal transition (pass case).
- One test for an illegal transition involving the new state (throw case).
- One test for terminal behavior if the new state is terminal.

### 4. Update every provider's `state-mapping.ts`

For each provider package whose status set could plausibly map to the new state:

1. Open `packages/<provider>/src/state-mapping.ts`.
2. Decide which upstream status (if any) maps to the new canonical state.
3. Add the mapping. If no upstream status maps to it, leave the file alone — `null` already means "no mapping," and that's a valid stance.
4. Update `packages/<provider>/src/__tests__/state-mapping.test.ts` to cover the new mapping (or the explicit "no mapping" case if you decided against).

A provider that doesn't need to know about the new state is fine — `state-mapping.ts` is a partial function from upstream statuses to canonical states. The new state only needs a mapping where the provider's upstream surface actually emits a corresponding signal.

### 5. Update dashboard webhook handler tests

`apps/dashboard/src/lib/webhooks/__tests__/handler-factory.test.ts` covers transition outcomes. Add:

- A normalize case that emits the new state, plus a transaction in a legal predecessor — expect `processingStatus = processed`.
- A normalize case that emits the new state from an illegal predecessor — expect `processingStatus = failed`.

### 6. Migrate existing transactions if semantics change

This step is only required when an existing state's semantics shift (rare). If you're purely *adding* a state, skip ahead.

If semantics change, write a Prisma migration that updates `TransactionRecord` rows with the old state to the new state where appropriate. Wrap in a transaction. Provide a rollback. Coordinate the rollout — apps reading the old state during the migration window will see stale values.

### 7. Document the change

In `docs/projects/demo-meta-system/DECISIONS.md`, promote the draft D-NNN entry to a real one with status `Accepted` and date. Cross-reference from D-010.

Update `packages/transactions/AGENTS.md` if the lifecycle diagram in the body changed.

### 8. Run the gates

```bash
pnpm --filter @dynamic-demos/transactions test
pnpm --filter @dynamic-demos/dashboard test
pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test
```

## Failure handling

| Symptom | Cause | Fix |
|---|---|---|
| TypeScript error: `Type '"x"' is not assignable to type 'TransactionState'` | Stale build of `@dynamic-demos/transactions` | Run `pnpm --filter @dynamic-demos/transactions build` |
| `assertValidTransition` throws in production | Forgot to update a predecessor's `LegalTransitions` entry | Update entry, redeploy. Don't bypass the assert. |
| Webhook handler logs `illegal-transition` for valid events | `state-mapping.ts` for that provider didn't emit the new state | Update mapping + redeploy provider integration |
| Dashboard table shows old state for in-flight transactions | Semantics changed without a migration | See step 6 |

## Common gotchas

- **Don't add a state "just in case."** Every state is a permanent contract. Compose existing states with metadata first.
- **Don't make a state "almost terminal."** It's terminal (in `TerminalStates`, transitions to `[]`) or it isn't. No half-measures.
- **Don't introduce a state without an upstream status that could produce it.** New states should be added in response to a concrete provider signal, not in anticipation.
- **Don't update `LegalTransitions` outside this runbook.** Direct edits without the D-NNN entry + tests + provider migrations cause silent webhook failures.
- **Don't forget Magic-send.** `submitted-transfer` / `transfer-confirmed` / `submitted-userop` are existing states (Phase 7). New states between these need explicit thought about whether the userop pipeline interacts.

## See also

- `packages/transactions/src/state.ts` — the source of truth.
- `packages/transactions/src/machine.ts` — `assertValidTransition` implementation.
- `docs/projects/demo-meta-system/DECISIONS.md` — D-010 + the draft slot for new D-NNN entries.
- `docs/engineering/add-new-webhook-receiver.md` — for the provider-side mapping changes.
