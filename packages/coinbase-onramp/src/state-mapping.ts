/**
 * Coinbase Onramp → canonical TransactionState mapping.
 *
 * STUB: `packages/transactions` (Phase 1E) has not yet merged. Once that
 * package lands, replace `CanonicalTransactionStatePlaceholder` with the
 * real `TransactionState` import and tighten the lookup table.
 *
 * Tracked: docs/projects/demo-meta-system/phases/01b-providers.md.
 */

/**
 * TODO(1E): swap for the canonical `TransactionState` enum exported by
 * `@dynamic-demos/transactions` once that package lands.
 */
export type CanonicalTransactionStatePlaceholder =
  | "initialized"
  | "draft"
  | "submitted"
  | "pending"
  | "confirmed"
  | "expired"
  | "abandoned"
  | "failed"
  | "cancelled";

/**
 * Coinbase Onramp order statuses observed today (per the public CDP API
 * docs and the create-order response inspected at extraction time).
 *
 * Treated as a string union rather than a closed enum to tolerate
 * upstream additions without runtime crashes.
 */
export type CoinbaseOnrampOrderStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired"
  | (string & {});

/**
 * Translate a Coinbase Onramp order status into the canonical state.
 *
 * Returns `null` for unrecognized inputs so callers can decide whether to
 * fall back to a default state, ignore the event, or surface an alert.
 */
export function mapCoinbaseOnrampStatus(
  status: CoinbaseOnrampOrderStatus,
): CanonicalTransactionStatePlaceholder | null {
  switch (status) {
    case "pending":
      return "submitted";
    case "in_progress":
      return "pending";
    case "completed":
      return "confirmed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    default:
      return null;
  }
}
