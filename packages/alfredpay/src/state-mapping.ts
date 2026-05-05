/**
 * Provider-status → canonical TransactionState mapping for alfredPay.
 *
 * STATUS: STUB. The canonical state machine lives in `packages/transactions`
 * (Phase 1E). Until that package merges to main, this module exposes a
 * locally-defined placeholder enum so consumers (the dashboard) compile
 * against a stable surface. When 1E lands the placeholder is replaced by
 * a re-export of `TransactionState` from `@dynamic-demos/transactions`.
 *
 * @see DECISIONS.md D-010 — packages/transactions owns the canonical state machine
 * @see docs/projects/demo-meta-system/phases/01b-providers.md — sub-prompt 1B-alfredpay
 */

import type { AlfredpayStatus } from "./types";

/**
 * Placeholder for the canonical `TransactionState` enum that will live in
 * `@dynamic-demos/transactions` after Phase 1E. The terminal-state ordering
 * matches DECISIONS.md D-010.
 *
 * TODO(phase-1e): replace with `import type { TransactionState } from
 * "@dynamic-demos/transactions"` once that package is published.
 */
export const CANONICAL_TRANSACTION_STATES = [
  "initialized",
  "draft",
  "submitted",
  "pending",
  "confirmed",
  "expired",
  "abandoned",
  "failed",
  "cancelled",
] as const;

export type CanonicalTransactionState =
  (typeof CANONICAL_TRANSACTION_STATES)[number];

/**
 * Maps an alfredPay upstream status to the canonical lifecycle state.
 *
 * Mapping rationale (placeholder, finalized in Phase 1E):
 * - `received` / `pending`     → `submitted` — alfredPay accepted the offramp,
 *                                stablecoin still inbound on source chain.
 * - `processing`               → `pending`   — onchain leg cleared, fiat payout
 *                                pending bank confirmation.
 * - `completed`                → `confirmed` — terminal happy path.
 * - `rejected` / `failed`      → `failed`    — terminal sad path.
 * - `cancelled`                → `cancelled` — operator or user cancellation.
 * - `expired`                  → `expired`   — timed out before customer paid.
 *
 * Defaults to `pending` for unknown statuses so we never drop the txn into
 * a confirmed/failed terminal by accident on an unrecognized string.
 */
export function mapAlfredpayStatusToCanonical(
  status: AlfredpayStatus | string | undefined | null,
): CanonicalTransactionState {
  switch (status) {
    case "received":
    case "pending":
      return "submitted";
    case "processing":
      return "pending";
    case "completed":
      return "confirmed";
    case "rejected":
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    default:
      return "pending";
  }
}
