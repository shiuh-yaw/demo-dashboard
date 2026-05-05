import type { TransactionState } from "./state";
import { assertValidTransition } from "./validators";

/**
 * Optional metadata supplied to a transition. The state machine itself
 * does not persist this — callers are expected to log or attach it to
 * their own audit/event records.
 */
export interface TransitionContext {
  /** Free-form reason string (e.g. "user-cancelled", "lifi-timeout"). */
  reason?: string;
  /** Arbitrary structured metadata for downstream consumers. */
  metadata?: Record<string, unknown>;
}

/**
 * Object shape any helper accepts: must carry a `state` field.
 * Other fields are preserved across the transition.
 */
type WithState = { state: TransactionState };

/**
 * Generic transition: validates `from → to` and returns a new object
 * with the new state. Prefer the named helpers below — `transition()`
 * is the escape hatch for callers that already hold a target state
 * (e.g. provider state-mapping output).
 *
 * `ctx` is accepted but intentionally unused here; callers that need
 * to log it should do so before/after invoking this helper.
 */
export function transition<T extends WithState, S extends TransactionState>(
  t: T,
  to: S,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: TransitionContext
): Omit<T, "state"> & { state: S } {
  assertValidTransition(t.state, to);
  return { ...t, state: to };
}

/** initialized | <terminal-source> → draft (only initialized is legal). */
export function draft<T extends WithState>(
  t: T,
  ctx?: TransitionContext
): Omit<T, "state"> & { state: "draft" } {
  return transition(t, "draft", ctx);
}

/** draft → submitted. */
export function submit<T extends WithState>(
  t: T,
  ctx?: TransitionContext
): Omit<T, "state"> & { state: "submitted" } {
  return transition(t, "submitted", ctx);
}

/** submitted → pending. */
export function pending<T extends WithState>(
  t: T,
  ctx?: TransitionContext
): Omit<T, "state"> & { state: "pending" } {
  return transition(t, "pending", ctx);
}

/** pending → confirmed. Terminal. */
export function confirm<T extends WithState>(
  t: T,
  ctx?: TransitionContext
): Omit<T, "state"> & { state: "confirmed" } {
  return transition(t, "confirmed", ctx);
}

/** submitted | pending → failed. Terminal. */
export function fail<T extends WithState>(
  t: T,
  ctx?: TransitionContext
): Omit<T, "state"> & { state: "failed" } {
  return transition(t, "failed", ctx);
}

/** initialized | draft | submitted → cancelled. Terminal. */
export function cancel<T extends WithState>(
  t: T,
  ctx?: TransitionContext
): Omit<T, "state"> & { state: "cancelled" } {
  return transition(t, "cancelled", ctx);
}

/** initialized → expired. Terminal. */
export function expire<T extends WithState>(
  t: T,
  ctx?: TransitionContext
): Omit<T, "state"> & { state: "expired" } {
  return transition(t, "expired", ctx);
}

/** draft → abandoned. Terminal. */
export function abandon<T extends WithState>(
  t: T,
  ctx?: TransitionContext
): Omit<T, "state"> & { state: "abandoned" } {
  return transition(t, "abandoned", ctx);
}
