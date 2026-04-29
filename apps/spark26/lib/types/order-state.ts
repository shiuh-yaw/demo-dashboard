export type OrderStatus =
  | "awaiting_payment"
  | "checkout_ready"
  | "tx_in_flight"
  | "tx_confirmed"
  | "paid"
  | "tx_failed"
  | "checkout_expired"
  | "cancelled";

export const TERMINAL_STATUSES: readonly OrderStatus[] = ["paid", "cancelled"] as const;

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export type OrderState = {
  version: number;
  confirmationNumber: string;
  cventOrderId: string;
  cventAttendeeId: string;
  cventEventId: string;
  amountDue: string;
  currency: string;
  attendeeName?: string;
  status: OrderStatus;

  dynamicCheckoutId?: string;
  // `dynamicTransactionId` is set by `markInFlightAction` from the
  // Dynamic-SDK-returned tx id and provides the binding we replay-check
  // against in `confirmPaymentAction`. If Redis is wiped mid-flow and the
  // record is re-seeded from Cvent, this field is absent — `confirmPaymentAction`
  // refuses to confirm in that case and forces the user to start a fresh
  // checkout, rather than trusting a client-supplied id that could be
  // replayed across orders sharing our destination wallet.
  dynamicTransactionId?: string;
  txHash?: string;
  sourceChain?: string;
  sourceAsset?: string;
  sourceAssetLogo?: string;
  settlementChain: "base";
  settlementAsset: "USDC";

  // FX snapshot locked at checkout start. Populated by createCheckoutAction
  // via lockRate(). `amountDueUsd` is the USD figure the onchain settlement
  // is verified against (confirmPaymentAction). For USD-native orders these
  // are still populated with `fxSource: "identity"` and `fxRate: "1.0000"`.
  // Absent prior to the first checkout creation (e.g. freshly-seeded orders
  // from the resolver, comped orders that go straight to paid).
  amountDueUsd?: string;
  fxRate?: string;
  fxSource?: "coinbase" | "cache" | "identity";
  fxLockedAt?: string;

  // Set by the Cvent postback worker. Absent on `tx_confirmed` orders
  // that have not yet been reconciled with Cvent.
  cventTransactionId?: string;
  cventPostAttempts: number;
  cventPostLastError?: string;

  createdAt: string;
  updatedAt: string;
  paidAt?: string;
};

export class OrderConflictError extends Error {
  constructor(confirmation: string) {
    super(`Order ${confirmation} was modified concurrently; retry limit exceeded`);
    this.name = "OrderConflictError";
  }
}

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus, expected: readonly OrderStatus[]) {
    super(
      `Invalid transition ${from} → ${to}; expected current status ∈ [${expected.join(", ")}]`
    );
    this.name = "InvalidTransitionError";
  }
}
