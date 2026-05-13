import { describe, it, expect, vi, beforeEach } from "vitest";

const readByConfirmation = vi.fn();
const transition = vi.fn();
const upsertFromCvent = vi.fn();
const postOfflineCharge = vi.fn();

vi.mock("@/lib/store/order-store", () => ({
  readByConfirmation,
  transition,
  upsertFromCvent,
}));
vi.mock("@/lib/cvent/transactions", () => ({ postOfflineCharge }));

beforeEach(() => {
  readByConfirmation.mockReset();
  transition.mockReset();
  upsertFromCvent.mockReset();
  postOfflineCharge.mockReset();
});

describe("runCventPostback", () => {
  it("advances tx_confirmed → paid on successful Cvent charge", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      cventAttendeeId: "a1",
      cventOrderId: "o1",
      txHash:
        "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      confirmationNumber: "ABC",
      amountDue: "10",
      currency: "USD",
    });
    postOfflineCharge.mockResolvedValue({ id: "ctx-1", success: true });
    transition.mockResolvedValue({ status: "paid" });

    const { runCventPostback } = await import("./postback.js");
    const result = await runCventPostback("ABC");

    expect(result).toEqual({ ok: true });
    expect(postOfflineCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        attendeeId: "a1",
        orderId: "o1",
        // First 29 chars of the 0x-prefixed tx hash (Cvent reference cap).
        reference: "0xabcdef0123456789abcdef01234",
      })
    );
    expect(
      (postOfflineCharge.mock.calls[0]?.[0] as { reference: string }).reference
        .length,
    ).toBeLessThanOrEqual(29);
    expect(transition).toHaveBeenCalledWith(
      "ABC",
      ["tx_confirmed"],
      "paid",
      expect.objectContaining({
        cventTransactionId: "ctx-1",
        cventPostAttempts: 1,
      })
    );
  });

  it("counts the successful Cvent post as an attempt after prior failures", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      cventAttendeeId: "a1",
      cventOrderId: "o1",
      txHash:
        "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      confirmationNumber: "ABC",
      amountDue: "10",
      currency: "USD",
      cventPostAttempts: 2,
    });
    postOfflineCharge.mockResolvedValue({ id: "ctx-1", success: true });
    transition.mockResolvedValue({ status: "paid" });

    const { runCventPostback } = await import("./postback.js");
    const result = await runCventPostback("ABC");

    expect(result).toEqual({ ok: true });
    expect(transition).toHaveBeenCalledWith(
      "ABC",
      ["tx_confirmed"],
      "paid",
      expect.objectContaining({ cventPostAttempts: 3 })
    );
  });

  it("skips when order not found", async () => {
    readByConfirmation.mockResolvedValue(null);
    const { runCventPostback } = await import("./postback.js");
    const result = await runCventPostback("ABC");
    expect(result).toEqual({ ok: true, skipped: "not-found" });
    expect(postOfflineCharge).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  it("skips when order is already past tx_confirmed", async () => {
    readByConfirmation.mockResolvedValue({
      status: "paid",
      confirmationNumber: "ABC",
    });
    const { runCventPostback } = await import("./postback.js");
    const result = await runCventPostback("ABC");
    expect(result).toEqual({ ok: true, skipped: "paid" });
    expect(postOfflineCharge).not.toHaveBeenCalled();
  });

  it("classifies 4xx (not 429) as permanent and records attempt", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      cventAttendeeId: "a1",
      cventOrderId: "o1",
      confirmationNumber: "ABC",
      amountDue: "10",
      currency: "USD",
      cventPostAttempts: 0,
    });
    postOfflineCharge.mockRejectedValue(new Error("400 Bad Request"));

    const { runCventPostback } = await import("./postback.js");
    const result = await runCventPostback("ABC");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retry).toBe(false);
      expect(result.error).toContain("400");
    }
    expect(upsertFromCvent).toHaveBeenCalledWith(
      "ABC",
      expect.objectContaining({
        cventPostAttempts: 1,
        cventPostLastError: expect.stringContaining("400"),
      })
    );
  });

  it("classifies 429 as retriable", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      cventAttendeeId: "a1",
      cventOrderId: "o1",
      confirmationNumber: "ABC",
      amountDue: "10",
      currency: "USD",
      cventPostAttempts: 2,
    });
    postOfflineCharge.mockRejectedValue(new Error("429 Too Many Requests"));

    const { runCventPostback } = await import("./postback.js");
    const result = await runCventPostback("ABC");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retry).toBe(true);
    expect(upsertFromCvent).toHaveBeenCalledWith(
      "ABC",
      expect.objectContaining({ cventPostAttempts: 3 })
    );
  });

  it("fails permanently when stored order lacks cventOrderId", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      cventAttendeeId: "a1",
      cventOrderId: "", // missing — degraded seed
      confirmationNumber: "ABC",
      amountDue: "10",
      currency: "USD",
      cventPostAttempts: 0,
    });

    const { runCventPostback } = await import("./postback.js");
    const result = await runCventPostback("ABC");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retry).toBe(false);
      expect(result.error).toMatch(/cventOrderId/);
    }
    expect(postOfflineCharge).not.toHaveBeenCalled();
  });

  it("classifies 5xx as retriable", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      cventAttendeeId: "a1",
      cventOrderId: "o1",
      confirmationNumber: "ABC",
      amountDue: "10",
      currency: "USD",
      cventPostAttempts: 0,
    });
    postOfflineCharge.mockRejectedValue(new Error("503 Service Unavailable"));

    const { runCventPostback } = await import("./postback.js");
    const result = await runCventPostback("ABC");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retry).toBe(true);
  });
});
