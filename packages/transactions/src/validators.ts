import { LegalTransitions, TerminalStates, type TransactionState } from "./state";

/**
 * Thrown when a transition is not permitted by `LegalTransitions`.
 *
 * Carries `from` and `to` so callers (logs, error reporters,
 * webhook routers) can surface the violation without re-parsing
 * the message.
 */
export class IllegalTransitionError extends Error {
  public readonly from: TransactionState;
  public readonly to: TransactionState;

  constructor(from: TransactionState, to: TransactionState) {
    super(`Illegal transition: ${from} → ${to}`);
    this.name = "IllegalTransitionError";
    this.from = from;
    this.to = to;
  }
}

/**
 * Throws `IllegalTransitionError` if `to` is not in
 * `LegalTransitions[from]`. Otherwise returns void.
 */
export function assertValidTransition(
  from: TransactionState,
  to: TransactionState
): void {
  const allowed = LegalTransitions[from];
  if (!allowed.includes(to)) {
    throw new IllegalTransitionError(from, to);
  }
}

/**
 * True if `s` is a terminal state. Terminal states have an empty
 * `LegalTransitions[s]` and accept no further helpers.
 */
export function isTerminal(s: TransactionState): boolean {
  return TerminalStates.has(s);
}
