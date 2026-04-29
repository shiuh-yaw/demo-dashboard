import { getOrderByNumber, type CventOrder } from "./cvent/orders.js";
import {
  createOrderState,
  readByConfirmation,
  transition,
  upsertFromCvent,
} from "./store/order-store.js";
import { isTerminal, type OrderState } from "./types/order-state.js";
import { lockFxIfMissing } from "./fx/rate.js";
import { env } from "./env";

// SPARK26 prices every order in EUR regardless of what Cvent's `currency`
// field reports — the event's Cvent config is not reliably set to EUR,
// but business pricing is EUR. Normalize at the boundary so the rest of
// the flow (PaymentView, admin, lockRate) sees a single source of truth.
const SPARK26_CURRENCY = "EUR";

const HOT_CACHE_MS = 30_000;

export type ResolveResult =
  | { kind: "not_found" }
  | { kind: "cancelled"; order: OrderState }
  | { kind: "unpaid"; order: OrderState }
  | { kind: "pending"; order: OrderState }
  | { kind: "paid"; order: OrderState };

function toNumber(v: string | number | undefined): number {
  if (v === undefined) return 0;
  return typeof v === "number" ? v : Number.parseFloat(v);
}

function classify(order: OrderState): ResolveResult {
  // `tx_confirmed` is UI-terminal: the attendee sees "Confirmed" the moment
  // we verify the chain tx, without waiting for the Cvent postback to land.
  // Internally the state stays distinct from `paid` so the reconcile cron,
  // admin view, and retry logic can still find orders that haven't posted
  // to Cvent yet.
  if (order.status === "paid" || order.status === "tx_confirmed") {
    return { kind: "paid", order };
  }
  if (order.status === "cancelled") return { kind: "cancelled", order };
  if (order.status === "tx_in_flight") return { kind: "pending", order };
  return { kind: "unpaid", order };
}

export async function resolveOrderState(confirmation: string): Promise<ResolveResult> {
  const cached = await readByConfirmation(confirmation);

  // `tx_confirmed` is UI-terminal even though it's not in isTerminal()
  // (which is scoped to the store's ACTIVE_SET pruning — the reconcile
  // cron needs tx_confirmed orders to stay in that set). Short-circuit
  // here so a stale cached.updatedAt can't cause a Cvent refetch that
  // might regress the UI back to PaymentView before the postback lands.
  if (cached && (isTerminal(cached.status) || cached.status === "tx_confirmed")) {
    return classify(cached);
  }

  if (
    cached &&
    Date.now() - Date.parse(cached.updatedAt) < HOT_CACHE_MS
  ) {
    return classify(cached);
  }

  const cvent = await getOrderByNumber(confirmation);
  if (!cvent) return { kind: "not_found" };

  if (cvent.cancelled) {
    const seeded =
      cached ?? (await createOrderState(stateFromCvent(confirmation, cvent)));
    const cancelled = await transition(
      confirmation,
      [seeded.status],
      "cancelled",
      { amountDue: String(toNumber(cvent.amountDue)), currency: SPARK26_CURRENCY }
    );
    return { kind: "cancelled", order: cancelled };
  }

  const amountDue = toNumber(cvent.amountDue);

  if (amountDue === 0) {
    if (!cached) {
      // Comped attendee: Cvent's side is already paid and we have no Redis
      // record. Seed directly as paid — this isn't a state-machine hop
      // over QStash, it's the initial write for an order that never needed
      // the payment flow.
      const seeded = await createOrderState(stateFromCvent(confirmation, cvent));
      const paid = await transition(confirmation, [seeded.status], "paid", {
        amountDue: "0",
        currency: SPARK26_CURRENCY,
      });
      return { kind: "paid", order: paid };
    }
    // Cached record exists: QStash (or admin retry) owns the transition to
    // paid. A user page reload that happens to see Cvent's post-charge 0
    // must not bypass that ownership. Return the cached state as-is; if
    // the Cvent postback has already landed, the worker has already
    // transitioned us to paid, and `classify(cached)` reflects that.
    // (The short-circuit above also covers cached.status === tx_confirmed
    // so we don't even reach this branch in that race.)
    return classify(cached);
  }

  if (!cached) {
    const created = await createOrderState(stateFromCvent(confirmation, cvent));
    const locked = await safeLockFx(created);
    return classify(locked);
  }

  const refreshed = await upsertFromCvent(confirmation, {
    amountDue: String(amountDue),
    currency: SPARK26_CURRENCY,
  });
  const locked = await safeLockFx(refreshed);
  return classify(locked);
}

// lockFxIfMissing internally swallows FxUnavailableError (falls back to
// un-FX'd order), but a transient Redis outage or a CAS OrderConflictError
// from updateFx would still propagate and 500 the page render. The resolver
// path is the first paint an attendee sees — falling back to the un-FX'd
// order keeps PaymentView rendering in EUR; createCheckoutAction will
// re-attempt the lock on Start click.
async function safeLockFx(order: OrderState): Promise<OrderState> {
  try {
    return await lockFxIfMissing(order);
  } catch (err) {
    console.warn(
      `[spark26][resolver] lockFxIfMissing failed for ${order.confirmationNumber}; falling back to un-FX'd order`,
      err,
    );
    return order;
  }
}

// Defensive read used by mid-flow server actions (markInFlight, confirmPayment).
// If Redis has lost the order — dev restart, manual `redis-cli DEL`, Upstash
// eviction, etc. — fall back to `resolveOrderState` which re-seeds from Cvent.
// Returns null only if Cvent itself doesn't recognize the confirmation (or the
// currency is unsupported), so callers can still bail hard on a truly-unknown
// order. The caller is responsible for deciding whether a re-seeded order
// (which will be `awaiting_payment` without a Dynamic checkoutId) is
// acceptable for the action being taken.
export async function readOrReseed(
  confirmation: string,
): Promise<OrderState | null> {
  const cached = await readByConfirmation(confirmation);
  if (cached) return cached;

  const result = await resolveOrderState(confirmation);
  if (result.kind === "not_found") {
    return null;
  }
  return result.order;
}

function stateFromCvent(confirmation: string, cvent: CventOrder) {
  const firstName = cvent.attendee?.firstName ?? "";
  const lastName = cvent.attendee?.lastName ?? "";
  const attendeeName = `${firstName} ${lastName}`.trim() || undefined;
  return {
    confirmationNumber: confirmation,
    cventOrderId: cvent.id ?? "",
    cventAttendeeId: cvent.attendee?.id ?? "",
    cventEventId: env.CVENT_EVENT_ID,
    amountDue: String(toNumber(cvent.amountDue)),
    currency: SPARK26_CURRENCY,
    attendeeName,
  };
}
