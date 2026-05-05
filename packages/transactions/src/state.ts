/**
 * Canonical transaction state machine.
 *
 * See `DECISIONS.md` D-010. Apps and provider packages MUST NOT assign
 * `state` directly — go through the helpers in `./machine.ts`, which
 * enforce `LegalTransitions` at runtime.
 *
 * Lifecycle (happy path):
 *   initialized → draft → submitted → pending → confirmed
 *
 * Terminal exits at every non-terminal step:
 *   initialized → expired | cancelled
 *   draft       → abandoned | cancelled
 *   submitted   → failed | cancelled
 *   pending     → failed
 *
 * Terminal states (`confirmed`, `expired`, `abandoned`, `failed`,
 * `cancelled`) accept no further transitions.
 */
export const TransactionState = {
  initialized: "initialized",
  draft: "draft",
  submitted: "submitted",
  pending: "pending",
  confirmed: "confirmed",
  // terminal
  expired: "expired",
  abandoned: "abandoned",
  failed: "failed",
  cancelled: "cancelled",
} as const;

export type TransactionState =
  (typeof TransactionState)[keyof typeof TransactionState];

/**
 * Adjacency table of legal transitions. Each key maps to the set of
 * states that may follow. Terminal states map to `[]`.
 *
 * Invariant: every `TransactionState` MUST appear as a key.
 */
export const LegalTransitions: Record<TransactionState, TransactionState[]> = {
  initialized: ["draft", "expired", "cancelled"],
  draft: ["submitted", "abandoned", "cancelled"],
  submitted: ["pending", "failed", "cancelled"],
  pending: ["confirmed", "failed"],
  confirmed: [],
  expired: [],
  abandoned: [],
  failed: [],
  cancelled: [],
};

/**
 * The five terminal states. A transaction in any of these states is
 * frozen — no helper will accept it as a transition source.
 */
export const TerminalStates: ReadonlySet<TransactionState> = new Set<
  TransactionState
>(["confirmed", "expired", "abandoned", "failed", "cancelled"]);
