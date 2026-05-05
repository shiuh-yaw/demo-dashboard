/**
 * BlindPay status -> canonical TransactionState mapping.
 *
 * **Stub implementation.** Phase 1E ships `packages/transactions` which owns
 * the canonical state machine (D-010). Until that package merges this file
 * exposes a placeholder enum and a `mapBlindpayStatus()` helper so package
 * surface remains stable; consumers should not depend on the placeholder
 * values reaching production.
 *
 * TODO(phase-1e): replace `CanonicalTransactionStatePlaceholder` with the
 * real `TransactionState` import from `@dynamic-demos/transactions` and
 * tighten the mapping (currently every BlindPay status maps to a sentinel).
 */

/**
 * Placeholder mirror of the canonical state machine pending Phase 1E.
 * Values intentionally match the planned canonical machine in
 * `docs/projects/demo-meta-system/PLAN.md` to ease the upcoming swap.
 */
export const CanonicalTransactionStatePlaceholder = {
  initialized: "initialized",
  draft: "draft",
  submitted: "submitted",
  pending: "pending",
  confirmed: "confirmed",
  failed: "failed",
  cancelled: "cancelled",
  expired: "expired",
  abandoned: "abandoned",
} as const;

export type CanonicalTransactionStatePlaceholder =
  (typeof CanonicalTransactionStatePlaceholder)[keyof typeof CanonicalTransactionStatePlaceholder];

/**
 * Known BlindPay payout/payin lifecycle statuses observed in their docs +
 * webhook fixtures. The list is intentionally permissive — BlindPay may add
 * new states; unknown inputs fall through to `failed` rather than throwing
 * so a webhook with an unexpected status never blocks the pipeline.
 */
export type BlindpayStatus =
  | "pending"
  | "processing"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

/**
 * Map BlindPay's upstream status string to the canonical placeholder state.
 * Phase 1E will replace the return type with the real enum.
 */
export function mapBlindpayStatus(
  status: string,
): CanonicalTransactionStatePlaceholder {
  switch (status as BlindpayStatus) {
    case "pending":
      return CanonicalTransactionStatePlaceholder.pending;
    case "processing":
    case "in_progress":
      return CanonicalTransactionStatePlaceholder.submitted;
    case "completed":
      return CanonicalTransactionStatePlaceholder.confirmed;
    case "cancelled":
      return CanonicalTransactionStatePlaceholder.cancelled;
    case "expired":
      return CanonicalTransactionStatePlaceholder.expired;
    case "failed":
    default:
      return CanonicalTransactionStatePlaceholder.failed;
  }
}
