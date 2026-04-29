import { describe, it, expect, vi, beforeEach } from "vitest";

const createCheckout = vi.fn();
const readByConfirmation = vi.fn();
const transition = vi.fn();
const withLock = vi.fn(async (_c: string, fn: () => Promise<unknown>) => fn());
const lockRate = vi.fn();
const updateFx = vi.fn();
const computeAmountDueUsd = vi.fn((amt: string, rate: number) => {
  // Minimal real implementation so tests that don't override it get correct values.
  const [whole = "0", frac = ""] = amt.split(".");
  const fracPadded = (frac + "00").slice(0, 2);
  const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fracPadded, 10);
  const usdCents = Math.round(cents * rate);
  const d = Math.floor(usdCents / 100);
  const c = usdCents % 100;
  return `${d}.${String(c).padStart(2, "0")}`;
});

vi.mock("@/lib/dynamic/server", () => ({ createCheckout }));
vi.mock("@/lib/fx/rate", () => ({
  lockRate,
  FxUnavailableError: class FxUnavailableError extends Error {
    constructor(m: string) {
      super(m);
      this.name = "FxUnavailableError";
    }
  },
}));
vi.mock("@/lib/fx/compute", () => ({ computeAmountDueUsd }));
vi.mock("@/lib/store/order-store", () => ({
  readByConfirmation,
  transition,
  updateFx,
  withLock,
}));
vi.mock("@/lib/env", () => ({
  env: { SPARK26_DESTINATION_ADDRESS: "0xdest" },
}));

beforeEach(() => {
  createCheckout.mockReset();
  readByConfirmation.mockReset();
  transition.mockReset();
  withLock.mockClear();
  lockRate.mockReset();
  updateFx.mockReset();
  // Default: USD-identity lock so legacy tests don't need to set it.
  lockRate.mockResolvedValue({
    rate: 1,
    source: "identity",
    fetchedAt: "2026-04-22T14:32:00.000Z",
  });
  updateFx.mockImplementation(async (_c: string, fx: unknown) => ({ ...fx as object }));
});

describe("createCheckoutAction", () => {
  it("creates a Dynamic checkout and transitions to checkout_ready", async () => {
    readByConfirmation.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "ABC",
      amountDue: "499.00",
      currency: "USD",
      version: 1,
    });
    createCheckout.mockResolvedValue({ checkoutId: "chk-1" });
    transition.mockResolvedValue({
      status: "checkout_ready",
      dynamicCheckoutId: "chk-1",
    });
    const { createCheckoutAction } = await import("./create-checkout.js");
    const result = await createCheckoutAction("ABC");
    expect(result.checkoutId).toBe("chk-1");
    expect(createCheckout).toHaveBeenCalledWith({ destinationAddress: "0xdest" });
    expect(transition).toHaveBeenCalledWith(
      "ABC",
      ["awaiting_payment", "checkout_expired", "tx_failed"],
      "checkout_ready",
      expect.objectContaining({ dynamicCheckoutId: "chk-1" })
    );
  });

  it("rejects when order is in a non-retryable state", async () => {
    readByConfirmation.mockResolvedValue({ status: "paid" });
    const { createCheckoutAction } = await import("./create-checkout.js");
    await expect(createCheckoutAction("ABC")).rejects.toThrow(/cannot create checkout/i);
  });

  it("rejects when order does not exist", async () => {
    readByConfirmation.mockResolvedValue(null);
    const { createCheckoutAction } = await import("./create-checkout.js");
    await expect(createCheckoutAction("ABC")).rejects.toThrow(/not found/i);
  });

  it("rejects malformed confirmation input before any I/O", async () => {
    const { createCheckoutAction } = await import("./create-checkout.js");
    await expect(createCheckoutAction("../etc/passwd")).rejects.toThrow(
      /invalid confirmation/i,
    );
    expect(withLock).not.toHaveBeenCalled();
  });

  it("is idempotent when status is already checkout_ready with a dynamicCheckoutId", async () => {
    // Reproduces the StrictMode double-mount / double-click race: a second
    // call arriving after the first has already transitioned state should
    // return the existing checkoutId instead of throwing.
    readByConfirmation.mockResolvedValue({
      status: "checkout_ready",
      confirmationNumber: "ABC",
      amountDue: "499.00",
      currency: "USD",
      version: 1,
      dynamicCheckoutId: "chk-existing",
    });
    const { createCheckoutAction } = await import("./create-checkout.js");
    const result = await createCheckoutAction("ABC");
    expect(result.checkoutId).toBe("chk-existing");
    expect(createCheckout).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
    expect(lockRate).not.toHaveBeenCalled();
    expect(updateFx).not.toHaveBeenCalled();
  });

  it("locks FX rate for EUR orders, persists FX fields, and passes USD amount to Dynamic", async () => {
    readByConfirmation.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "EUR1",
      amountDue: "50",
      currency: "EUR",
      version: 1,
    });
    lockRate.mockResolvedValue({
      rate: 1.085,
      source: "coinbase",
      fetchedAt: "2026-04-22T14:32:00.000Z",
    });
    updateFx.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "EUR1",
      amountDue: "50",
      currency: "EUR",
      amountDueUsd: "54.25",
      fxRate: "1.0850",
      fxSource: "coinbase",
      fxLockedAt: "2026-04-22T14:32:00.000Z",
      version: 2,
    });
    createCheckout.mockResolvedValue({ checkoutId: "chk-eur" });
    transition.mockResolvedValue({
      status: "checkout_ready",
      dynamicCheckoutId: "chk-eur",
      amountDueUsd: "54.25",
    });

    const { createCheckoutAction } = await import("./create-checkout.js");
    const result = await createCheckoutAction("EUR1");

    expect(lockRate).toHaveBeenCalledWith("EUR");
    expect(updateFx).toHaveBeenCalledWith("EUR1", {
      amountDueUsd: "54.25",
      fxRate: "1.0850",
      fxSource: "coinbase",
      fxLockedAt: "2026-04-22T14:32:00.000Z",
    });
    expect(createCheckout).toHaveBeenCalledWith({
      destinationAddress: "0xdest",
    });
    expect(result.checkoutId).toBe("chk-eur");
  });

  it("uses identity path for USD orders (rate=1, source=identity)", async () => {
    readByConfirmation.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "USD1",
      amountDue: "100.00",
      currency: "USD",
      version: 1,
    });
    updateFx.mockResolvedValue({
      status: "awaiting_payment",
      amountDueUsd: "100.00",
      fxRate: "1.0000",
      fxSource: "identity",
      version: 2,
    });
    createCheckout.mockResolvedValue({ checkoutId: "chk-usd" });
    transition.mockResolvedValue({
      status: "checkout_ready",
      dynamicCheckoutId: "chk-usd",
      amountDueUsd: "100.00",
    });

    const { createCheckoutAction } = await import("./create-checkout.js");
    await createCheckoutAction("USD1");

    expect(lockRate).toHaveBeenCalledWith("USD");
    expect(updateFx).toHaveBeenCalledWith("USD1", {
      amountDueUsd: "100.00",
      fxRate: "1.0000",
      fxSource: "identity",
      fxLockedAt: "2026-04-22T14:32:00.000Z",
    });
  });

  it("surfaces FxUnavailableError without creating a Dynamic checkout", async () => {
    readByConfirmation.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "EUR2",
      amountDue: "50",
      currency: "EUR",
      version: 1,
    });
    const { FxUnavailableError } = await import("@/lib/fx/rate");
    lockRate.mockRejectedValue(new FxUnavailableError("EUR"));

    const { createCheckoutAction } = await import("./create-checkout.js");
    await expect(createCheckoutAction("EUR2")).rejects.toBeInstanceOf(
      FxUnavailableError,
    );
    expect(createCheckout).not.toHaveBeenCalled();
    expect(updateFx).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  it("re-locks rate when entering from checkout_expired (retry path)", async () => {
    readByConfirmation.mockResolvedValue({
      status: "checkout_expired",
      confirmationNumber: "EUR3",
      amountDue: "50",
      currency: "EUR",
      fxRate: "1.0700",
      amountDueUsd: "53.50",
      version: 3,
    });
    lockRate.mockResolvedValue({
      rate: 1.09,
      source: "coinbase",
      fetchedAt: "2026-04-22T15:00:00.000Z",
    });
    updateFx.mockResolvedValue({
      status: "checkout_expired",
      fxRate: "1.0900",
      amountDueUsd: "54.50",
      version: 4,
    });
    createCheckout.mockResolvedValue({ checkoutId: "chk-eur-retry" });
    transition.mockResolvedValue({
      status: "checkout_ready",
      dynamicCheckoutId: "chk-eur-retry",
      amountDueUsd: "54.50",
    });

    const { createCheckoutAction } = await import("./create-checkout.js");
    await createCheckoutAction("EUR3");

    expect(lockRate).toHaveBeenCalledWith("EUR");
    expect(updateFx).toHaveBeenCalledWith("EUR3", expect.objectContaining({
      amountDueUsd: "54.50",
      fxRate: "1.0900",
    }));
  });

  it("rounds amountDueUsd correctly for amounts that would hit FP half-cent drift", async () => {
    // EUR 11 at rate 1.085 = 11.935 exact; the old round2() implementation
    // produced "11.93" due to IEEE 754 underestimate. The fixed integer-cent
    // path produces "11.94".
    readByConfirmation.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "EURROUND",
      amountDue: "11.00",
      currency: "EUR",
      version: 1,
    });
    lockRate.mockResolvedValue({
      rate: 1.085,
      source: "coinbase",
      fetchedAt: "2026-04-22T14:32:00.000Z",
    });
    createCheckout.mockResolvedValue({ checkoutId: "chk-round" });
    transition.mockResolvedValue({ status: "checkout_ready", dynamicCheckoutId: "chk-round" });

    const { createCheckoutAction } = await import("./create-checkout.js");
    await createCheckoutAction("EURROUND");

    expect(updateFx).toHaveBeenCalledWith("EURROUND", expect.objectContaining({
      amountDueUsd: "11.94",
      fxRate: "1.0850",
    }));
  });

  it("skips FX lock when FX fields already present and status is awaiting_payment", async () => {
    // Resolver locked FX during page render — createCheckoutAction must reuse
    // the existing rate without calling lockRate or updateFx again.
    readByConfirmation.mockResolvedValue({
      status: "awaiting_payment",
      confirmationNumber: "EUR4",
      amountDue: "50",
      currency: "EUR",
      amountDueUsd: "54.25",
      fxRate: "1.0850",
      fxSource: "coinbase",
      fxLockedAt: "2026-04-22T14:32:00.000Z",
      version: 2,
    });
    createCheckout.mockResolvedValue({ checkoutId: "chk-skip" });
    transition.mockResolvedValue({
      status: "checkout_ready",
      dynamicCheckoutId: "chk-skip",
      amountDueUsd: "54.25",
    });

    const { createCheckoutAction } = await import("./create-checkout.js");
    const result = await createCheckoutAction("EUR4");

    expect(lockRate).not.toHaveBeenCalled();
    expect(updateFx).not.toHaveBeenCalled();
    expect(createCheckout).toHaveBeenCalledWith({ destinationAddress: "0xdest" });
    expect(transition).toHaveBeenCalled();
    expect(result.checkoutId).toBe("chk-skip");
  });
});
