---
name: "@dynamic-demos/transactions"
kind: package
flow_role: utility
custody: n/a
status: stable
---

# @dynamic-demos/transactions

Canonical state machine for the "money in flight" transaction lifecycle (D-010). Every provider package, every dashboard service, and every demo app **must** route lifecycle changes through the helpers exported here — direct `state` assignment is a contract violation. Provider state mappers translate upstream statuses into `TransactionState`; the helpers in `machine.ts` enforce `LegalTransitions` at runtime.

## Capabilities

- Canonical states — `TransactionState` const + type with all nine values.
- Adjacency table — `LegalTransitions` mapping each state to its legal successors.
- Terminal set — `TerminalStates` (`confirmed`, `expired`, `abandoned`, `failed`, `cancelled`).
- Validators — `assertValidTransition(from, to)`, `isTerminal(state)`, `IllegalTransitionError`.
- Transition helpers — `draft`, `submit`, `pending`, `confirm`, `fail`, `cancel`, `expire`, `abandon`, plus a generic `transition(tx, to, ctx)` for cases where the helper signature doesn't fit.
- Types — `Transaction`, `TransactionRefs`, `TransitionContext`.

## Public surface

All exports are stable and live at the package root (`@dynamic-demos/transactions`).

- `TransactionState` — const + type with values: `initialized | draft | submitted | pending | confirmed | expired | abandoned | failed | cancelled`. (stable)
- `LegalTransitions` — adjacency table of legal transitions. (stable)
- `TerminalStates` — read-only set of terminal states. (stable)
- `assertValidTransition(from, to)` — throws `IllegalTransitionError` on illegal transitions. (stable)
- `isTerminal(state)` — predicate for terminal states. (stable)
- `IllegalTransitionError` — typed error carrying `from` + `to`. (stable)
- `draft`, `submit`, `pending`, `confirm`, `fail`, `cancel`, `expire`, `abandon` — typed transition helpers. (stable)
- `transition(tx, to, ctx)` — generic helper when a fixed verb doesn't apply. (stable)
- Types — `Transaction`, `TransactionRefs`, `TransitionContext`. (stable)

## Required environment

None. The package is pure logic — no I/O, no env reads.

## Slots vs invariants

**Slots:**

- The shape of `TransactionRefs` (provider ids, beneficiary ids, demo instance id) is open for additive extension as new providers wire up.
- `TransitionContext` allows callers to carry timestamps, audit reasons, and per-provider metadata.

**Invariants:**

- The legal lifecycle (D-010) is:
  - Happy path: `initialized → draft → submitted → pending → confirmed`.
  - Terminal exits: `initialized → expired | cancelled`, `draft → abandoned | cancelled`, `submitted → failed | cancelled`, `pending → failed`.
- Terminal states accept no further transitions. `assertValidTransition` enforces this at runtime.
- No code outside this package may assign `Transaction.state` directly. Always go through a helper or `transition(...)`.
- Per-provider state mapping lives in the provider package (`packages/<provider>/src/state-mapping.ts`). Mappers return `TransactionState`; transitions go through this package's helpers.
- Pure logic only. No `process.env`, no `fetch`, no DB calls. Adding any of those breaks the test surface.
- Spark26 keeps its local `lib/types/order-state.ts` machine by exception (D-006); do not migrate it.

## Integration map

**Imports:** none.
**Imported by:** every Phase 1B provider package (`alfredpay`, `blindpay`, `iron`, `coinbase-onramp`, `lifi`) once Phase 1E rebinds their placeholder unions; `apps/dashboard` orchestration + webhook framework; future demo apps that persist transactions through the dashboard API.

## Examples

```ts
import {
  TransactionState,
  draft,
  submit,
  confirm,
  IllegalTransitionError,
} from "@dynamic-demos/transactions";

let tx = { id: "t-1", state: TransactionState.initialized, /* ... */ };

tx = draft(tx, { reason: "user filled form" });        // initialized → draft
tx = submit(tx, { providerId: "alfredpay-id" });       // draft → submitted
tx = confirm(tx, { txHash: "0x..." });                 // submitted → confirmed

try {
  tx = draft(tx);                                      // confirmed is terminal — throws
} catch (e) {
  if (e instanceof IllegalTransitionError) {
    console.error(`Refused: ${e.from} → ${e.to}`);
  }
}
```

## Do / Don't

- Do: route every state change through a helper (`draft`, `submit`, `confirm`, etc.) or `transition(...)`. Direct assignment bypasses validation and breaks audit trails.
- Do: keep provider state mapping in the provider package — return a `TransactionState`, then call this package's helpers from the orchestration layer.
- Do: surface `IllegalTransitionError` to logs; the `from`/`to` fields are intentional for monitoring.
- Don't: add I/O, env reads, or DB calls to this package. It must stay pure.
- Don't: introduce a new state without a follow-up to D-010 — every provider mapper depends on the closed set.
- Don't: migrate `apps/spark26` to this package. Spark26 is zero-touch (D-006).

## Open questions / known gaps

- The `Transaction` shape today is the minimum viable record. Phase 2-transactions will land the Prisma model + persistence flow; Phase 5A wires the webhook framework against the helpers.
- `TransitionContext` is intentionally open. Once 2-3 providers settle on shapes, narrow to a discriminated union per provider.
- No retry/idempotency helpers. If a webhook delivers the same event twice, callers should compare incoming target state to current state and skip the transition rather than throwing.
