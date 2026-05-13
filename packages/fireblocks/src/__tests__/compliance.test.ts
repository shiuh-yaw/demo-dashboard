import { describe, expect, it, vi } from "vitest";
import { createComplianceModule, FireblocksComplianceError } from "../compliance";

interface FakeSdkResponse {
  data?: {
    verdict?: string;
    riskScore?: number;
    providerResults?: Array<{ name: string; verdict?: string; raw?: unknown }>;
    [k: string]: unknown;
  };
}

function makeSdk(response: FakeSdkResponse | Error) {
  if (response instanceof Error) {
    return {
      compliance: {
        screenTransaction: vi.fn().mockRejectedValue(response),
      },
    };
  }
  return {
    compliance: {
      screenTransaction: vi.fn().mockResolvedValue(response),
    },
  };
}

describe("compliance.screenTransaction", () => {
  const params = {
    fromVaultAccountId: "1",
    toAddress: "0xabc",
    asset: "USDC_BASE_TEST",
    amount: "10",
  };

  it("maps all-allow provider results to verdict=allow", async () => {
    const response = {
      data: {
        verdict: "ALLOW",
        riskScore: 5,
        providerResults: [
          { name: "AML", verdict: "ALLOW" },
          { name: "Travel", verdict: "ALLOW" },
        ],
      },
    };
    const sdk = makeSdk(response);
    const compliance = createComplianceModule({ sdk: sdk as never });
    const result = await compliance.screenTransaction(params);
    expect(result.verdict).toBe("allow");
    expect(result.riskScore).toBe(5);
    expect(result.providers).toHaveLength(2);
    expect(result.raw).toEqual(response);
  });

  it("maps any-block provider result to verdict=block", async () => {
    const sdk = makeSdk({
      data: {
        verdict: "BLOCK",
        providerResults: [
          { name: "AML", verdict: "ALLOW" },
          { name: "Sanctions", verdict: "BLOCK" },
        ],
      },
    });
    const compliance = createComplianceModule({ sdk: sdk as never });
    const result = await compliance.screenTransaction(params);
    expect(result.verdict).toBe("block");
  });

  it("maps any-review (no block) to verdict=review", async () => {
    const sdk = makeSdk({
      data: {
        verdict: "REVIEW",
        providerResults: [
          { name: "AML", verdict: "ALLOW" },
          { name: "Travel", verdict: "REVIEW" },
        ],
      },
    });
    const compliance = createComplianceModule({ sdk: sdk as never });
    const result = await compliance.screenTransaction(params);
    expect(result.verdict).toBe("review");
  });

  it("preserves raw SDK response for callers who need detail", async () => {
    const raw = { data: { verdict: "ALLOW", extraField: "preserved", providerResults: [] } };
    const sdk = makeSdk(raw);
    const compliance = createComplianceModule({ sdk: sdk as never });
    const result = await compliance.screenTransaction(params);
    expect(result.raw).toEqual(raw);
  });

  it("wraps SDK errors as FireblocksComplianceError", async () => {
    const sdk = makeSdk(new Error("network down"));
    const compliance = createComplianceModule({ sdk: sdk as never });
    await expect(compliance.screenTransaction(params)).rejects.toBeInstanceOf(FireblocksComplianceError);
  });

  it("defaults to verdict=review when SDK response lacks a verdict field", async () => {
    const sdk = makeSdk({ data: {} });
    const compliance = createComplianceModule({ sdk: sdk as never });
    const result = await compliance.screenTransaction(params);
    expect(result.verdict).toBe("review");
  });
});
