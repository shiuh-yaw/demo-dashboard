/**
 * Pure delegation state machine, kept free of React and SDK imports so it is
 * unit-testable in a node environment (same reason `resolveGateState` is
 * extracted in dynamic-gate).
 *
 * Dynamic is the only authority here. The app's own store is not consulted:
 * whether our server has received its share is our problem, and a sign that
 * arrives before the webhook answers 409, which the screen surfaces.
 */

export type DelegationState =
  "not-delegated" | "delegating" | "delegated" | "revoking";

/** What the user asked for, until Dynamic reflects it. */
export type DelegationIntent = "grant" | "revoke";

export interface DelegationStateInput {
  /** `hasDelegatedAccess` - Dynamic has reshared for this wallet. */
  delegatedOnDynamic: boolean;
  isDelegating: boolean;
  isRevoking: boolean;
  /** Outstanding request, held until `delegatedOnDynamic` matches it. */
  pending: DelegationIntent | null;
}

/** Whether Dynamic now agrees with what was asked. */
export function isIntentSettled(
  intent: DelegationIntent,
  delegatedOnDynamic: boolean,
): boolean {
  return intent === "grant" ? delegatedOnDynamic : !delegatedOnDynamic;
}

export function resolveDelegationState(
  input: DelegationStateInput,
): DelegationState {
  if (input.isRevoking || input.pending === "revoke") return "revoking";
  // The mutation resolves before the SDK's refreshAuth repopulates the cache that
  // `hasDelegatedAccess` reads, so for a render both the pending flag and the
  // SDK say "not delegated". Without the intent the row would report failure
  // at the moment the grant succeeded.
  if (input.isDelegating || input.pending === "grant") return "delegating";
  return input.delegatedOnDynamic ? "delegated" : "not-delegated";
}
