/**
 * LI.FI status → canonical TransactionState mapping.
 *
 * `flow_role: bridge` — LI.FI exposes only a coarse status enum
 * (`PENDING | DONE | FAILED | NOT_FOUND`) plus an optional substatus
 * string. We surface a string-union placeholder until Phase 1E
 * (`packages/transactions`) lands the canonical `TransactionState` enum.
 *
 * TODO(phase-1e): replace `CanonicalLifiState` with the canonical
 * `TransactionState` import from `@dynamic-demos/transactions` and adjust
 * the return type of `mapLifiStatus` accordingly.
 */

import type { LifiStatusResult, LifiStatusValue } from "./types";

/**
 * Placeholder canonical state enum.
 *
 * The strings line up with the dashboard's existing transaction state
 * machine (`src/lib/types/dashboard.ts`) so consumers can switch over to
 * the canonical enum from Phase 1E with minimal churn.
 */
export type CanonicalLifiState =
  | "pending"
  | "confirmed"
  | "failed"
  | "not_found";

/**
 * Map a LI.FI upstream status to the canonical state enum.
 *
 * The mapping is deliberately narrow: LI.FI does not distinguish
 * `submitted` from `pending` at the REST layer, so we collapse both onto
 * `pending` and let the dashboard worker (which has additional context
 * such as the source-chain confirmation) refine the state if needed.
 */
export function mapLifiStatus(status: LifiStatusValue): CanonicalLifiState {
  switch (status) {
    case "DONE":
      return "confirmed";
    case "FAILED":
      return "failed";
    case "NOT_FOUND":
      return "not_found";
    case "PENDING":
    default:
      return "pending";
  }
}

/**
 * Convenience helper: map a full status response to the canonical state.
 */
export function mapLifiStatusResult(
  result: LifiStatusResult,
): CanonicalLifiState {
  return mapLifiStatus(result.status);
}
