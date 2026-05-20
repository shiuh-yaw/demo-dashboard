import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@dynamic-labs-sdk/client", () => ({
  createCheckoutTransaction: vi.fn(),
  attachCheckoutTransactionSource: vi.fn(),
  getCheckoutTransactionQuote: vi.fn(),
  submitCheckoutTransaction: vi.fn(),
  getCheckoutTransaction: vi.fn(),
  cancelCheckoutTransaction: vi.fn(),
}));

// no Dynamic client coupling inside the package — wrappers call SDK directly

import * as sdk from "@dynamic-labs-sdk/client";
import {
  createTransaction,
  attachWalletSource,
  getQuote,
  submit,
  cancel,
} from "@/checkout-flow";

describe("checkout-flow wrappers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createTransaction forwards params to SDK", async () => {
    (sdk.createCheckoutTransaction as any).mockResolvedValue({
      transaction: { id: "tx_1" },
      sessionToken: "dct_x",
      sessionExpiresAt: new Date(),
    });
    const res = await createTransaction({
      amount: "10.00",
      currency: "USD",
      destinationAddresses: [{ address: "0xabc", chain: "ETH" as any }],
      memo: { externalId: "ext_1" },
    });
    expect(sdk.createCheckoutTransaction).toHaveBeenCalledWith({
      amount: "10.00",
      currency: "USD",
      destinationAddresses: [{ address: "0xabc", chain: "ETH" }],
      memo: { externalId: "ext_1" },
    });
    expect(res.transaction.id).toBe("tx_1");
  });

  it("attachWalletSource forwards wallet params", async () => {
    (sdk.attachCheckoutTransactionSource as any).mockResolvedValue({ id: "tx_1" });
    await attachWalletSource({
      transactionId: "tx_1",
      fromAddress: "0xabc",
      fromChainId: "1",
      fromChainName: "ETH" as any,
    });
    expect(sdk.attachCheckoutTransactionSource).toHaveBeenCalledWith({
      sourceType: "wallet",
      transactionId: "tx_1",
      fromAddress: "0xabc",
      fromChainId: "1",
      fromChainName: "ETH",
    });
  });

  it("getQuote forwards params", async () => {
    (sdk.getCheckoutTransactionQuote as any).mockResolvedValue({ id: "tx_1" });
    await getQuote({ transactionId: "tx_1", fromTokenAddress: "0xtoken" });
    expect(sdk.getCheckoutTransactionQuote).toHaveBeenCalledWith({
      transactionId: "tx_1",
      fromTokenAddress: "0xtoken",
    });
  });

  it("submit forwards params + onStepChange", async () => {
    (sdk.submitCheckoutTransaction as any).mockResolvedValue({ id: "tx_1" });
    const onStepChange = vi.fn();
    const walletAccount: any = { address: "0xabc" };
    await submit({ transactionId: "tx_1", walletAccount, onStepChange });
    expect(sdk.submitCheckoutTransaction).toHaveBeenCalledWith({
      transactionId: "tx_1",
      walletAccount,
      onStepChange,
    });
  });

  it("cancel forwards transactionId", async () => {
    (sdk.cancelCheckoutTransaction as any).mockResolvedValue({ id: "tx_1" });
    await cancel({ transactionId: "tx_1" });
    expect(sdk.cancelCheckoutTransaction).toHaveBeenCalledWith({ transactionId: "tx_1" });
  });
});
