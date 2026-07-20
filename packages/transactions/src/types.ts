import type { TransactionState } from "./state";

/**
 * Cross-package references attached to a Transaction. Optional because
 * not every demo or test fixture has all three (e.g. early Phase 1
 * dashboard transactions predate `prospectId`).
 */
export interface TransactionRefs {
  /** ID of the demo instance (config) that initiated the transaction. */
  demoInstanceId?: string;
  /** ID of the prospect profile linked to the demo instance. */
  prospectId?: string;
  /** ID of the parent transaction in a multi-leg flow (e.g. sandwich). */
  parentTransactionId?: string;
}

/**
 * Canonical Transaction record. The `kind` discriminator is a string
 * tag; demos are free to subtype it (e.g. `'disbursement' | 'payout' |
 * 'swap' | 'checkout'`). The `state` field is always one of the
 * canonical `TransactionState` values — no per-demo widening allowed.
 *
 * `payload` is the kind-specific data shape; consumers parameterize
 * `TPayload` to get strict typing while sharing the same lifecycle.
 */
export interface Transaction<
  TKind extends string = string,
  TPayload = unknown,
> {
  /** Globally unique transaction id. */
  id: string;
  /** Discriminator tag for the demo/flow that owns this transaction. */
  kind: TKind;
  /** Current canonical state. Never assign directly — use helpers. */
  state: TransactionState;
  /** Cross-package references. */
  refs: TransactionRefs;
  /** Kind-specific data payload. */
  payload: TPayload;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-update timestamp. */
  updatedAt: string;
}
