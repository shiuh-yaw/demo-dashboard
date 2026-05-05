/**
 * @dynamic-demos/transactions
 *
 * Canonical state machine for the "money in flight" transaction
 * lifecycle. See `DECISIONS.md` D-010 and the package AGENTS.md stub
 * (Phase 3 will fill in the authoritative content).
 *
 * Public surface:
 *   - TransactionState (const + type)
 *   - LegalTransitions, TerminalStates
 *   - Transaction, TransactionRefs
 *   - assertValidTransition, isTerminal, IllegalTransitionError
 *   - draft, submit, pending, confirm, fail, cancel, expire, abandon, transition
 *   - TransitionContext
 */
export {
  LegalTransitions,
  TerminalStates,
  TransactionState,
} from "./state";

export type { Transaction, TransactionRefs } from "./types";

export {
  IllegalTransitionError,
  assertValidTransition,
  isTerminal,
} from "./validators";

export type { TransitionContext } from "./machine";
export {
  abandon,
  cancel,
  confirm,
  draft,
  expire,
  fail,
  pending,
  submit,
  transition,
} from "./machine";
