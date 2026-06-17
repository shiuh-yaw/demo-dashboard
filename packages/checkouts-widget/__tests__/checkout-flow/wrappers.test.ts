import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@dynamic-labs-sdk/client", () => ({
  createCheckoutTransaction: vi.fn(),
  attachFlowSource: vi.fn(),
  getFlowQuote: vi.fn(),
  submitFlowTransaction: vi.fn(),
  getFlow: vi.fn(),
  cancelFlow: vi.fn(),
}));

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
      transaction: { id: "flow_1" },
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
    expect(res.transaction.id).toBe("flow_1");
  });

  it("attachWalletSource forwards wallet params to attachFlowSource", async () => {
    (sdk.attachFlowSource as any).mockResolvedValue({
      flow: { id: "flow_1" },
      sessionToken: "dft_x",
    });
    await attachWalletSource({
      transactionId: "flow_1",
      fromAddress: "0xabc",
      fromChainId: "1",
      fromChainName: "ETH" as any,
    });
    expect(sdk.attachFlowSource).toHaveBeenCalledWith({
      flowId: "flow_1",
      fromAddress: "0xabc",
      fromChainId: "1",
      fromChainName: "ETH",
      sourceType: "wallet",
    });
  });

  it("getQuote forwards params to getFlowQuote", async () => {
    (sdk.getFlowQuote as any).mockResolvedValue({ id: "flow_1" });
    await getQuote({
      transactionId: "flow_1",
      fromTokenAddress: "0xtoken",
      fromChainId: "8453",
    });
    expect(sdk.getFlowQuote).toHaveBeenCalledWith({
      flowId: "flow_1",
      fromTokenAddress: "0xtoken",
      fromChainId: "8453",
    });
  });

  it("submit forwards params + onStepChange to submitFlowTransaction", async () => {
    (sdk.submitFlowTransaction as any).mockResolvedValue({ id: "flow_1" });
    const onStepChange = vi.fn();
    const walletAccount: any = { address: "0xabc" };
    await submit({ transactionId: "flow_1", walletAccount, onStepChange });
    expect(sdk.submitFlowTransaction).toHaveBeenCalledWith({
      flowId: "flow_1",
      walletAccount,
      onStepChange,
    });
  });

  it("cancel forwards flowId to cancelFlow", async () => {
    (sdk.cancelFlow as any).mockResolvedValue({ id: "flow_1" });
    await cancel({ transactionId: "flow_1" });
    expect(sdk.cancelFlow).toHaveBeenCalledWith({ flowId: "flow_1" });
  });
});
