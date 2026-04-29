import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchCheckoutTransaction = vi.fn();
const readByConfirmation = vi.fn();
const readOrReseed = vi.fn();
const transition = vi.fn();
const enqueueCventPostback = vi.fn();

vi.mock("@/lib/dynamic/server", () => ({ fetchCheckoutTransaction }));
vi.mock("@/lib/env", () => ({
  env: {
    SPARK26_DESTINATION_ADDRESS: "0xDEST0000000000000000000000000000000000AA",
  },
}));
vi.mock("@/lib/store/order-store", () => ({
  readByConfirmation,
  transition,
}));
vi.mock("@/lib/resolve-order-state", () => ({ readOrReseed }));
vi.mock("@/lib/upstash/qstash", () => ({ enqueueCventPostback }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers([["host", "example.com"]]),
}));

const DEST = "0xDEST0000000000000000000000000000000000AA";
const VALID_TX_ID = "3d7c0c7f-76de-4e4a-ae34-36ef123281f3";
const OTHER_TX_ID = "11111111-2222-3333-4444-555555555555";

// amountDue "499.00" in 6-decimal USDC micro-units
const FIVE_HUNDRED_MICRO = "499000000";
// amountDue "0.05" in 6-decimal USDC micro-units
const FIVE_CENTS_MICRO = "50000";

beforeEach(() => {
  fetchCheckoutTransaction.mockReset();
  readByConfirmation.mockReset();
  readOrReseed.mockReset();
  transition.mockReset();
  enqueueCventPostback.mockReset();
});

describe("confirmPaymentAction", () => {
  it("trusts Dynamic settlement + verifies amount, transitions to tx_confirmed", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_in_flight",
      dynamicCheckoutId: "chk-1",
      dynamicTransactionId: VALID_TX_ID,
      amountDue: "499.00",
      confirmationNumber: "ABC",
    });
    fetchCheckoutTransaction.mockResolvedValue({
      id: VALID_TX_ID,
      executionState: "broadcasted",
      settlementState: "completed",
      toAddress: DEST,
      txHash: "0xdynamicReported",
      quote: { toAmount: FIVE_HUNDRED_MICRO },
    });
    transition.mockResolvedValue({
      status: "tx_confirmed",
      txHash: "0xdynamicReported",
    });
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    const result = await confirmPaymentAction("ABC", {
      dynamicTransactionId: VALID_TX_ID,
      txHash: "0xclientHash",
      sourceChain: "ethereum",
      sourceAsset: "USDC",
    });
    expect(fetchCheckoutTransaction).toHaveBeenCalledWith(VALID_TX_ID);
    expect(transition).toHaveBeenCalledWith(
      "ABC",
      ["tx_in_flight"],
      "tx_confirmed",
      expect.objectContaining({
        txHash: "0xdynamicReported",
        sourceChain: "ethereum",
        sourceAsset: "USDC",
      }),
    );
    expect(enqueueCventPostback).toHaveBeenCalled();
    expect(result.status).toBe("tx_confirmed");
    expect(readOrReseed).not.toHaveBeenCalled();
  });

  it("rejects malformed confirmation input before any I/O", async () => {
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("../../etc/passwd", {
        dynamicTransactionId: VALID_TX_ID,
        txHash: "0xhash",
      }),
    ).rejects.toThrow(/invalid confirmation/i);
    expect(readByConfirmation).not.toHaveBeenCalled();
  });

  it("rejects non-UUID transaction id before any I/O", async () => {
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("ABC", {
        dynamicTransactionId: "../../foo",
        txHash: "0xhash",
      }),
    ).rejects.toThrow(/invalid transaction/i);
    expect(readByConfirmation).not.toHaveBeenCalled();
  });

  it("rejects if the dynamicTransactionId doesn't match our Redis record", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_in_flight",
      dynamicCheckoutId: "chk-1",
      dynamicTransactionId: VALID_TX_ID,
      amountDue: "499.00",
    });
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("ABC", {
        dynamicTransactionId: OTHER_TX_ID,
        txHash: "0xhash",
      }),
    ).rejects.toThrow(/mismatch|does not match/i);
    expect(fetchCheckoutTransaction).not.toHaveBeenCalled();
  });

  it("rejects if Dynamic has not reported settlement completed", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_in_flight",
      dynamicCheckoutId: "chk-1",
      dynamicTransactionId: VALID_TX_ID,
      amountDue: "499.00",
    });
    fetchCheckoutTransaction.mockResolvedValue({
      id: VALID_TX_ID,
      executionState: "broadcasted",
      settlementState: "bridging",
      toAddress: DEST,
      quote: { toAmount: FIVE_HUNDRED_MICRO },
    });
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("ABC", {
        dynamicTransactionId: VALID_TX_ID,
        txHash: "0xhash",
      }),
    ).rejects.toThrow(/settlement not completed/i);
    expect(transition).not.toHaveBeenCalled();
    expect(enqueueCventPostback).not.toHaveBeenCalled();
  });

  it("rejects if Dynamic reports a destination other than ours", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_in_flight",
      dynamicCheckoutId: "chk-1",
      dynamicTransactionId: VALID_TX_ID,
      amountDue: "499.00",
    });
    fetchCheckoutTransaction.mockResolvedValue({
      id: VALID_TX_ID,
      executionState: "broadcasted",
      settlementState: "completed",
      toAddress: "0xATTACKER00000000000000000000000000000000",
      txHash: "0xdynamicReported",
      quote: { toAmount: FIVE_HUNDRED_MICRO },
    });
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("ABC", {
        dynamicTransactionId: VALID_TX_ID,
        txHash: "0xhash",
      }),
    ).rejects.toThrow(/destination mismatch/i);
    expect(transition).not.toHaveBeenCalled();
    expect(enqueueCventPostback).not.toHaveBeenCalled();
  });

  it("rejects if the settled amount is less than amountDue (amount-swap attack)", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_in_flight",
      dynamicCheckoutId: "chk-1",
      dynamicTransactionId: VALID_TX_ID,
      amountDue: "499.00",
    });
    fetchCheckoutTransaction.mockResolvedValue({
      id: VALID_TX_ID,
      executionState: "broadcasted",
      settlementState: "completed",
      toAddress: DEST,
      txHash: "0xdynamicReported",
      // attacker created the checkout-tx for $0.05 instead of $499
      quote: { toAmount: FIVE_CENTS_MICRO },
    });
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("ABC", {
        dynamicTransactionId: VALID_TX_ID,
        txHash: "0xhash",
      }),
    ).rejects.toThrow(/settled amount too low/i);
    expect(transition).not.toHaveBeenCalled();
    expect(enqueueCventPostback).not.toHaveBeenCalled();
  });

  it("rejects if Dynamic response omits quote.toAmount (can't verify amount)", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_in_flight",
      dynamicCheckoutId: "chk-1",
      dynamicTransactionId: VALID_TX_ID,
      amountDue: "499.00",
    });
    fetchCheckoutTransaction.mockResolvedValue({
      id: VALID_TX_ID,
      executionState: "broadcasted",
      settlementState: "completed",
      toAddress: DEST,
      txHash: "0xdynamicReported",
      // no quote field at all
    });
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("ABC", {
        dynamicTransactionId: VALID_TX_ID,
        txHash: "0xhash",
      }),
    ).rejects.toThrow(/no quote\.toAmount/i);
    expect(transition).not.toHaveBeenCalled();
  });

  it("refuses confirmation when Redis was wiped (recovery path is closed to cross-order replay)", async () => {
    readByConfirmation.mockResolvedValue(null);
    readOrReseed.mockResolvedValue({
      status: "awaiting_payment",
      amountDue: "499.00",
      confirmationNumber: "ABC",
    });
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("ABC", {
        dynamicTransactionId: VALID_TX_ID,
        txHash: "0xhash",
      }),
    ).rejects.toThrow(/reset|refresh the page/i);
    expect(fetchCheckoutTransaction).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
    expect(enqueueCventPostback).not.toHaveBeenCalled();
  });

  it("still fails hard when neither Redis nor Cvent knows the confirmation", async () => {
    readByConfirmation.mockResolvedValue(null);
    readOrReseed.mockResolvedValue(null);
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("BOGUS", {
        dynamicTransactionId: VALID_TX_ID,
        txHash: "0xhash",
      }),
    ).rejects.toThrow(/not found/i);
    expect(fetchCheckoutTransaction).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  it("accepts settled amount exactly equal to amountDue", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_in_flight",
      dynamicCheckoutId: "chk-1",
      dynamicTransactionId: VALID_TX_ID,
      amountDue: "0.05",
    });
    fetchCheckoutTransaction.mockResolvedValue({
      id: VALID_TX_ID,
      executionState: "broadcasted",
      settlementState: "completed",
      toAddress: DEST,
      txHash: "0xdynamicReported",
      quote: { toAmount: FIVE_CENTS_MICRO },
    });
    transition.mockResolvedValue({ status: "tx_confirmed" });
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("ABC", {
        dynamicTransactionId: VALID_TX_ID,
        txHash: "0xhash",
      }),
    ).resolves.toBeDefined();
  });

  it("accepts settled amount slightly above amountDue (bridge over-delivery)", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_in_flight",
      dynamicCheckoutId: "chk-1",
      dynamicTransactionId: VALID_TX_ID,
      amountDue: "0.05",
    });
    fetchCheckoutTransaction.mockResolvedValue({
      id: VALID_TX_ID,
      executionState: "broadcasted",
      settlementState: "completed",
      toAddress: DEST,
      txHash: "0xdynamicReported",
      // bridge delivered 50009 micro-USDC, slightly over 50000 expected
      quote: { toAmount: "50009" },
    });
    transition.mockResolvedValue({ status: "tx_confirmed" });
    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("ABC", {
        dynamicTransactionId: VALID_TX_ID,
        txHash: "0xhash",
      }),
    ).resolves.toBeDefined();
  });

  it("verifies settlement against amountDueUsd when present (EUR order)", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_in_flight",
      confirmationNumber: "EURPAY",
      dynamicTransactionId: VALID_TX_ID,
      amountDue: "50",
      currency: "EUR",
      amountDueUsd: "54.25",
      fxRate: "1.0850",
      fxSource: "coinbase",
    });
    fetchCheckoutTransaction.mockResolvedValue({
      settlementState: "completed",
      executionState: "completed",
      toAddress: DEST,
      quote: { toAmount: "54250000" },
      txHash: "0xhash",
    });
    transition.mockResolvedValue({ status: "tx_confirmed" });

    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("EURPAY", {
        dynamicTransactionId: VALID_TX_ID,
        txHash: "0xhash",
      }),
    ).resolves.toMatchObject({ status: "tx_confirmed" });
  });

  it("rejects settlement when Dynamic toAmount is below amountDueUsd", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_in_flight",
      confirmationNumber: "EURLOW",
      dynamicTransactionId: OTHER_TX_ID,
      amountDue: "50",
      currency: "EUR",
      amountDueUsd: "54.25",
    });
    fetchCheckoutTransaction.mockResolvedValue({
      settlementState: "completed",
      executionState: "completed",
      toAddress: DEST,
      quote: { toAmount: "50000000" },
      txHash: "0xhash",
    });

    const { confirmPaymentAction } = await import("./confirm-payment.js");
    await expect(
      confirmPaymentAction("EURLOW", {
        dynamicTransactionId: OTHER_TX_ID,
        txHash: "0xhash",
      }),
    ).rejects.toThrow(/too low/i);
  });
});
