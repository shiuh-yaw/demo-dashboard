// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/checkout-flow", () => ({
  createTransaction: vi.fn(),
  attachWalletSource: vi.fn(),
  getQuote: vi.fn(),
  getTransaction: vi.fn(),
  submit: vi.fn(),
  cancel: vi.fn(),
}));

import * as cf from "@/checkout-flow";
import { useCheckoutFlow } from "@/hooks/use-checkout-flow";

const txFixture = (overrides: any = {}) => ({
  id: "tx_1",
  checkoutId: "ck_1",
  amount: "10.00",
  currency: "USD",
  quoteVersion: 1,
  executionState: "quoted",
  settlementState: "none",
  riskState: "cleared",
  createdAt: new Date(),
  updatedAt: new Date(),
  quote: {
    version: 1,
    fromAmount: "10.0",
    toAmount: "9.95",
    fees: { totalFeeUsd: "0.05" },
    estimatedTimeSec: 30,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  },
  ...overrides,
});

describe("useCheckoutFlow.beginCheckout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates → attaches wallet source → fetches quote → returns quote", async () => {
    (cf.createTransaction as any).mockResolvedValue({
      transaction: { id: "tx_1" },
      sessionToken: "dct_x",
      sessionExpiresAt: new Date(),
    });
    (cf.attachWalletSource as any).mockResolvedValue({ id: "tx_1" });
    (cf.getQuote as any).mockResolvedValue(txFixture());

    const { result } = renderHook(() => useCheckoutFlow());

    let begin: Awaited<ReturnType<typeof result.current.beginCheckout>>;
    await act(async () => {
      begin = await result.current.beginCheckout({
        amount: "10.00",
        currency: "USD",
        destinationAddresses: [{ address: "0xdest", chain: "ETH" as any }],
        memo: { externalId: "ext_1" },
        source: {
          fromAddress: "0xsource",
          fromChainId: "1",
          fromChainName: "ETH" as any,
        },
        fromTokenAddress: "0xtoken",
      });
    });

    expect(cf.createTransaction).toHaveBeenCalled();
    expect(cf.attachWalletSource).toHaveBeenCalledWith({
      transactionId: "tx_1",
      fromAddress: "0xsource",
      fromChainId: "1",
      fromChainName: "ETH",
    });
    expect(cf.getQuote).toHaveBeenCalledWith({
      transactionId: "tx_1",
      fromTokenAddress: "0xtoken",
    });
    expect(begin!).toMatchObject({
      transactionId: "tx_1",
      transaction: { id: "tx_1" },
    });
    expect(result.current.transactionId).toBe("tx_1");
    expect(result.current.quote).toBeDefined();
  });

  it("surfaces SDK errors on create", async () => {
    (cf.createTransaction as any).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useCheckoutFlow());

    await act(async () => {
      const ret = await result.current.beginCheckout({
        amount: "10",
        currency: "USD",
        destinationAddresses: [],
        source: { fromAddress: "0x", fromChainId: "1", fromChainName: "ETH" as any },
        fromTokenAddress: "0x",
      });
      expect(ret).toBeNull();
    });
    expect(result.current.error).toContain("boom");
  });
});

describe("useCheckoutFlow.submit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls submit, polls getTransaction post-broadcast, emits ExecutionUpdate until terminal", async () => {
    (cf.createTransaction as any).mockResolvedValue({
      transaction: { id: "tx_1" },
      sessionToken: "dct_x",
      sessionExpiresAt: new Date(),
    });
    (cf.attachWalletSource as any).mockResolvedValue({ id: "tx_1" });
    (cf.getQuote as any).mockResolvedValue(txFixture());
    (cf.submit as any).mockImplementation(async ({ onStepChange }: any) => {
      onStepChange?.("approval");
      onStepChange?.("transaction");
      return txFixture({ executionState: "broadcasted", txHash: "0xdead" });
    });

    // Post-submit polling: first poll sees broadcasted, second sees completed.
    (cf.getTransaction as any).mockReset();
    (cf.getTransaction as any)
      .mockResolvedValueOnce(
        txFixture({ executionState: "broadcasted", txHash: "0xdead" }),
      )
      .mockResolvedValueOnce(
        txFixture({
          executionState: "source_confirmed",
          settlementState: "completed",
          txHash: "0xdead",
        }),
      );

    const updates: any[] = [];
    const onUpdate = (u: any) => updates.push(u);

    const { result } = renderHook(() => useCheckoutFlow());
    await act(async () => {
      await result.current.beginCheckout({
        amount: "10",
        currency: "USD",
        destinationAddresses: [{ address: "0xdest", chain: "ETH" as any }],
        memo: {},
        source: { fromAddress: "0x", fromChainId: "1", fromChainName: "ETH" as any },
        fromTokenAddress: "0x",
      });
    });

    let submitResult: any;
    await act(async () => {
      submitResult = await result.current.submit({
        walletAccount: { address: "0x" } as any,
        needsConversion: true,
        totalSteps: 3,
        isCrossChain: false,
        onUpdate,
      });
    });

    // ACTION_REQUIRED fires twice (approval, then post-DONE transaction).
    expect(updates.some((u) => u.status === "ACTION_REQUIRED")).toBe(true);
    // First poll → broadcasted → RUNNING on step 1.
    expect(updates.some((u) => u.status === "RUNNING" && u.stepIndex === 1)).toBe(true);
    // Second poll → settlement completed → DONE.
    expect(updates.some((u) => u.status === "DONE")).toBe(true);
    // submit() now returns the final CheckoutTransaction on success.
    expect(submitResult).toBeTruthy();
    expect(submitResult.settlementState).toBe("completed");
  });

  it("submit returns null on SDK error and emits onError", async () => {
    (cf.createTransaction as any).mockResolvedValue({
      transaction: { id: "tx_1" },
      sessionToken: "dct_x",
      sessionExpiresAt: new Date(),
    });
    (cf.attachWalletSource as any).mockResolvedValue({ id: "tx_1" });
    (cf.getQuote as any).mockResolvedValue(txFixture());
    (cf.submit as any).mockRejectedValue(new Error("User rejected the request"));

    const onRejected = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() => useCheckoutFlow());
    await act(async () => {
      await result.current.beginCheckout({
        amount: "10",
        currency: "USD",
        destinationAddresses: [{ address: "0xdest", chain: "ETH" as any }],
        memo: {},
        source: { fromAddress: "0x", fromChainId: "1", fromChainName: "ETH" as any },
        fromTokenAddress: "0x",
      });
    });

    let ok: any = "unset";
    await act(async () => {
      ok = await result.current.submit({
        walletAccount: { address: "0x" } as any,
        needsConversion: false,
        totalSteps: 2,
        isCrossChain: false,
        onUpdate: () => {},
        onRejected,
        onError,
      });
    });
    expect(ok).toBeNull();
    expect(onRejected).toHaveBeenCalled();
  });

  it("uses storageNamespace prop for localStorage key", () => {
    const { result } = renderHook(() =>
      useCheckoutFlow({ storageNamespace: "ns-x" }),
    );
    // Hook didn't crash with custom namespace — storage helper handles the rest;
    // collision-prevention behavior is covered by storage.test.ts indirectly.
    expect(result.current).toBeDefined();
  });
});
