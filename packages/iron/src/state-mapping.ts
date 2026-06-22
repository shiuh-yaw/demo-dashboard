/**
 * Iron Finance state-mapping.
 *
 * TODO(phase-1e): when `@dynamic-demos/transactions` lands and exports a
 * canonical `TransactionState` enum, replace `CanonicalTransactionState` below
 * with an import from that package and ensure every Iron status maps to a
 * canonical state.
 *
 * Until then, this file declares a placeholder enum that mirrors the shape
 * Phase 1E will publish, plus a pure mapper from Iron autoramp status strings
 * (and `RampStatus`) to that canonical enum.
 */

import type { RampStatus } from "./types";

/**
 * Placeholder for `@dynamic-demos/transactions`'s canonical `TransactionState`.
 * Replace when 1E merges (D-009 / D-010).
 */
export type CanonicalTransactionState =
  | "initialized"
  | "submitted"
  | "pending"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "expired";

/**
 * Map an Iron `RampStatus` (the dashboard's normalized form) to canonical state.
 */
export function rampStatusToCanonical(
  status: RampStatus,
): CanonicalTransactionState {
  switch (status) {
    case "pending":
      return "pending";
    case "processing":
      return "submitted";
    case "completed":
      return "confirmed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Map a raw Iron autoramp status string (e.g. "Authorized", "Approved") to
 * canonical state. An autoramp is a standing rule, NOT a transaction — "Approved"
 * means the rule is active and ready for deposits, not that a transfer completed.
 */
export function ironAutorampStatusToCanonical(
  status: string,
): CanonicalTransactionState {
  const map: Record<string, CanonicalTransactionState> = {
    Created: "initialized",
    EditPending: "initialized",
    Authorized: "pending",
    DepositAccountAdded: "pending",
    Approved: "submitted",
    Rejected: "failed",
    Cancelled: "cancelled",
  };
  return map[status] ?? "pending";
}

/**
 * Map a raw Iron transaction status string to canonical state.
 * Transactions are individual deposits/payouts against an autoramp.
 */
export function ironTransactionStatusToCanonical(
  status: string,
): CanonicalTransactionState {
  const map: Record<string, CanonicalTransactionState> = {
    FundsReviewInProgress: "pending",
    ConversionInProgress: "submitted",
    PayoutInProgress: "submitted",
    Completed: "confirmed",
    Failed: "failed",
    RejectedAml: "failed",
    RejectedFraud: "failed",
    RejectedMinAmount: "failed",
  };
  return map[status] ?? "pending";
}
