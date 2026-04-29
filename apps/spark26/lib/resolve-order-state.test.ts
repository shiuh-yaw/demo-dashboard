import { describe, it, expect, vi, beforeEach } from "vitest";

const getOrderByNumber = vi.fn();
const readByConfirmation = vi.fn();
const createOrderState = vi.fn();
const transition = vi.fn();
const upsertFromCvent = vi.fn();
// Default: identity — returns order unchanged so existing tests are unaffected.
const lockFxIfMissing = vi.fn(async (o: unknown) => o);

vi.mock("./cvent/orders.js", () => ({ getOrderByNumber }));
vi.mock("./store/order-store.js", () => ({
  readByConfirmation,
  createOrderState,
  transition,
  upsertFromCvent,
}));
vi.mock("./fx/rate.js", () => ({ lockFxIfMissing }));
vi.mock("./env", () => ({ env: { CVENT_EVENT_ID: "ev-1" } }));

beforeEach(() => {
  getOrderByNumber.mockReset();
  readByConfirmation.mockReset();
  createOrderState.mockReset();
  transition.mockReset();
  upsertFromCvent.mockReset();
  lockFxIfMissing.mockReset();
  lockFxIfMissing.mockImplementation(async (o: unknown) => o);
});

describe("resolveOrderState", () => {
  it("returns cached terminal state without hitting Cvent", async () => {
    readByConfirmation.mockResolvedValue({
      status: "paid",
      confirmationNumber: "ABC",
      updatedAt: new Date(Date.now() - 3600_000).toISOString(),
    });
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("ABC");
    expect(result.kind).toBe("paid");
    expect(getOrderByNumber).not.toHaveBeenCalled();
  });

  it("returns hot cache when non-terminal and <30s old", async () => {
    readByConfirmation.mockResolvedValue({
      status: "checkout_ready",
      confirmationNumber: "ABC",
      updatedAt: new Date(Date.now() - 5_000).toISOString(),
    });
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("ABC");
    expect(result.kind).toBe("unpaid");
    expect(getOrderByNumber).not.toHaveBeenCalled();
  });

  it("returns not_found when Cvent has no matching order", async () => {
    readByConfirmation.mockResolvedValue(null);
    getOrderByNumber.mockResolvedValue(null);
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("NOPE");
    expect(result.kind).toBe("not_found");
  });

  it("returns cancelled when Cvent flags the order cancelled", async () => {
    readByConfirmation.mockResolvedValue(null);
    getOrderByNumber.mockResolvedValue({
      id: "o1",
      number: "ABC",
      cancelled: true,
      currency: "USD",
      amountDue: 0,
      attendee: { id: "a1" },
    });
    createOrderState.mockResolvedValue({ status: "awaiting_payment", confirmationNumber: "ABC" });
    transition.mockResolvedValue({ status: "cancelled", confirmationNumber: "ABC" });
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("ABC");
    expect(result.kind).toBe("cancelled");
  });

  it("classifies any Cvent order as EUR-priced (Cvent's currency is ignored)", async () => {
    readByConfirmation.mockResolvedValue(null);
    getOrderByNumber.mockResolvedValue({
      id: "o1",
      number: "EURPATH",
      currency: "USD", // Cvent field is USD, but resolver must override to EUR
      amountDue: "50.00",
      attendee: { id: "a1" },
    });
    createOrderState.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "EURPATH",
      amountDue: "50",
      currency: "EUR",
    });
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("EURPATH");
    expect(result.kind).toBe("unpaid");
    if (result.kind === "unpaid") {
      expect(result.order.currency).toBe("EUR");
    }
    expect(createOrderState).toHaveBeenCalled();
  });

  it("creates awaiting_payment record when Cvent shows amountDue > 0 and no local record", async () => {
    readByConfirmation.mockResolvedValue(null);
    getOrderByNumber.mockResolvedValue({
      id: "o1",
      number: "ABC",
      currency: "USD",
      amountDue: "499.00",
      attendee: { id: "a1", firstName: "Ada", lastName: "Lovelace" },
    });
    createOrderState.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "ABC",
      amountDue: "499.00",
    });
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("ABC");
    expect(result.kind).toBe("unpaid");
    expect(createOrderState).toHaveBeenCalled();
  });

  it("does NOT transition a cached non-paid order to paid on a user reload (QStash owns it)", async () => {
    // A user reload that sees Cvent's post-charge amountDue=0 must not bypass
    // QStash ownership of the tx_confirmed → paid transition. The cached
    // state is returned as-is — if the QStash postback already landed, the
    // worker already transitioned us and classify() reflects paid; if it
    // hasn't, we stay at the cached status and wait for QStash/admin.
    readByConfirmation.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "ABC",
      amountDue: "1.21",
      currency: "USD",
      updatedAt: new Date(Date.now() - 60_000).toISOString(),
    });
    getOrderByNumber.mockResolvedValue({
      id: "o1",
      number: "ABC",
      currency: "USD",
      amountDue: 0,
      attendee: { id: "a1" },
    });
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("ABC");
    // awaiting_payment cached → classified as kind: "unpaid"
    expect(result.kind).toBe("unpaid");
    expect(transition).not.toHaveBeenCalled();
  });

  it("seeds as paid when no cached record and Cvent shows amountDue === 0 (comped attendee)", async () => {
    // Comped attendees are Cvent-paid from the start; there's no existing
    // record to transition — this is the initial write for an order that
    // never needed the SPARK26 payment flow. Still allowed.
    readByConfirmation.mockResolvedValue(null);
    getOrderByNumber.mockResolvedValue({
      id: "o1",
      number: "ABC",
      currency: "USD",
      amountDue: 0,
      attendee: { id: "a1", firstName: "Comped", lastName: "Attendee" },
    });
    createOrderState.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "ABC",
    });
    transition.mockResolvedValue({ status: "paid", confirmationNumber: "ABC" });
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("ABC");
    expect(result.kind).toBe("paid");
    expect(createOrderState).toHaveBeenCalled();
    expect(transition).toHaveBeenCalledWith(
      "ABC",
      expect.any(Array),
      "paid",
      expect.objectContaining({ amountDue: "0" }),
    );
  });

  it("classifies tx_confirmed as paid for UI display", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      confirmationNumber: "ABC",
      amountDue: "1.21",
      currency: "USD",
      updatedAt: new Date().toISOString(),
    });
    // Cached + non-stale → no Cvent refetch, just classify.
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("ABC");
    expect(result.kind).toBe("paid");
    expect(getOrderByNumber).not.toHaveBeenCalled();
  });

  it("does not refetch Cvent for a stale cached tx_confirmed order", async () => {
    // Without the dedicated short-circuit, a tx_confirmed order with
    // updatedAt > 30s would hit Cvent, and Cvent may still report
    // amountDue > 0 if the postback hasn't landed — flipping the UI
    // back to PaymentView. Guard against that regression.
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      confirmationNumber: "ABC",
      amountDue: "1.21",
      currency: "USD",
      updatedAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("ABC");
    expect(result.kind).toBe("paid");
    expect(getOrderByNumber).not.toHaveBeenCalled();
  });

  it("preserves cached.amountDue when Cvent shows 0 post-charge (race with postback)", async () => {
    // Race: postback has already charged Cvent so it now reports amountDue=0,
    // but the short-circuit fires first — Cvent is never called and the cached
    // amountDue ("1.21") is returned directly so ConfirmationView shows what
    // the attendee actually paid.
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      confirmationNumber: "ABC",
      amountDue: "1.21",
      updatedAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("ABC");
    expect(result.kind).toBe("paid");
    expect(result).toMatchObject({ order: expect.objectContaining({ amountDue: "1.21" }) });
    // Short-circuit means Cvent is never consulted and no transition is needed.
    expect(getOrderByNumber).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  it("locks FX when seeding a new unpaid EUR order (seed branch)", async () => {
    const createdOrder = {
      status: "awaiting_payment",
      confirmationNumber: "FX1",
      amountDue: "50",
      currency: "EUR",
    };
    readByConfirmation.mockResolvedValue(null);
    getOrderByNumber.mockResolvedValue({
      id: "o1",
      number: "FX1",
      currency: "USD",
      amountDue: "50",
      attendee: { id: "a1" },
    });
    createOrderState.mockResolvedValue(createdOrder);

    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("FX1");

    expect(result.kind).toBe("unpaid");
    expect(lockFxIfMissing).toHaveBeenCalledWith(createdOrder);
  });

  it("locks FX when refreshing a cached unpaid EUR order (upsert branch)", async () => {
    const staleOrder = {
      status: "awaiting_payment",
      confirmationNumber: "FX2",
      amountDue: "50",
      currency: "EUR",
      updatedAt: new Date(Date.now() - 60_000).toISOString(),
    };
    const refreshedOrder = { ...staleOrder, amountDue: "50" };
    readByConfirmation.mockResolvedValue(staleOrder);
    getOrderByNumber.mockResolvedValue({
      id: "o1",
      number: "FX2",
      currency: "USD",
      amountDue: "50",
      attendee: { id: "a1" },
    });
    upsertFromCvent.mockResolvedValue(refreshedOrder);

    const { resolveOrderState } = await import("./resolve-order-state.js");
    const result = await resolveOrderState("FX2");

    expect(result.kind).toBe("unpaid");
    expect(lockFxIfMissing).toHaveBeenCalledWith(refreshedOrder);
  });
});
