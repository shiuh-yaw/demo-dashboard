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
 *
 * Magic-send sub-states (Phase 7) — these are normal non-terminal
 * states that fit between `submitted` and `pending` for the two-leg
 * vault → embedded-wallet → destination flow. They model the userop
 * leg explicitly so dashboards can show progress between "vault
 * funded the user" and "user paid the destination":
 *
 *   submitted-transfer    — vault → embedded-wallet ERC-20 transfer
 *                           submitted to the chain (legacy `submitted`).
 *   transfer-confirmed    — transfer confirmed on-chain; webhook fired.
 *   submitted-userop      — userop dispatched via ZeroDev/Dynamic SDK.
 *
 * Magic-send happy path (extending the base lifecycle):
 *   initialized → submitted-transfer → transfer-confirmed
 *                → submitted-userop → confirmed
 *
 * The magic-send states fail/cancel into the existing terminals; no new
 * terminal states are introduced.
 */
export const TransactionState = {
  initialized: "initialized",
  draft: "draft",
  submitted: "submitted",
  pending: "pending",
  // magic-send sub-states (Phase 7)
  "submitted-transfer": "submitted-transfer",
  "transfer-confirmed": "transfer-confirmed",
  "submitted-userop": "submitted-userop",
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
  initialized: [
    "draft",
    "submitted-transfer",
    "expired",
    "cancelled",
  ],
  draft: ["submitted", "abandoned", "cancelled"],
  submitted: ["pending", "failed", "cancelled"],
  pending: ["confirmed", "failed"],
  // magic-send sub-states
  "submitted-transfer": ["transfer-confirmed", "failed", "cancelled"],
  "transfer-confirmed": ["submitted-userop", "failed"],
  "submitted-userop": ["confirmed", "failed"],
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
