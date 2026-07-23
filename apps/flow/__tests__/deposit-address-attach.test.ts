/**
 * Guards the deposit-address attach wrapper: the SDK's
 * AttachFlowSourceDepositAddressParams union arm has NO fromAddress -
 * sending one (or the wrong sourceType) breaks the attach call.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { attachFlowSourceMock } = vi.hoisted(() => ({
  attachFlowSourceMock: vi.fn(),
}));

vi.mock("@dynamic-labs-sdk/client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@dynamic-labs-sdk/client")>();
  return { ...actual, attachFlowSource: attachFlowSourceMock };
});

import { attachDepositAddressSource } from "@/lib/dynamic/flow-sdk";

describe("attachDepositAddressSource", () => {
  beforeEach(() => {
    attachFlowSourceMock.mockReset();
    attachFlowSourceMock.mockResolvedValue({
      flow: { id: "flow-1", executionState: "source_attached" },
    });
  });

  it("sends sourceType deposit_address and never a fromAddress", async () => {
    const flow = await attachDepositAddressSource({
      transactionId: "flow-1",
      fromChainId: "1",
      fromChainName: "BTC",
    });

    expect(attachFlowSourceMock).toHaveBeenCalledOnce();
    const params = attachFlowSourceMock.mock.calls[0]![0];
    expect(params.sourceType).toBe("deposit_address");
    expect(params.flowId).toBe("flow-1");
    expect(params.fromChainId).toBe("1");
    expect(params.fromChainName).toBe("BTC");
    expect("fromAddress" in params).toBe(false);
    expect(flow.id).toBe("flow-1");
  });

  it("passes refundAddress through when provided", async () => {
    await attachDepositAddressSource({
      transactionId: "flow-2",
      fromChainId: "101",
      fromChainName: "SOL",
      refundAddress: "refund-address-example",
    });
    expect(attachFlowSourceMock.mock.calls[0]![0].refundAddress).toBe(
      "refund-address-example",
    );
  });
});
