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
 * canonical state. Mirrors the private mapper in `IronFinanceClient`.
 */
export function ironAutorampStatusToCanonical(
  status: string,
): CanonicalTransactionState {
  const map: Record<string, CanonicalTransactionState> = {
    Created: "pending",
    EditPending: "pending",
    Authorized: "submitted",
    DepositAccountAdded: "submitted",
    Approved: "confirmed",
    Rejected: "failed",
    Cancelled: "cancelled",
  };
  return map[status] ?? "pending";
}
