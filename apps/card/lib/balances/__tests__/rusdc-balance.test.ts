import { describe, expect, it, vi } from "vitest";

const { readContract } = vi.hoisted(() => ({ readContract: vi.fn() }));
vi.mock("viem", async (orig) => {
  const actual = await orig<typeof import("viem")>();
  return { ...actual, createPublicClient: () => ({ readContract }) };
});

describe("readRusdcBalance", () => {
  it("reads balanceOf and formats with 6 decimals", async () => {
    readContract.mockResolvedValue(1500000n); // 1.5 RUSDC
    const { readRusdcBalance } = await import("../rusdc-balance");
    const out = await readRusdcBalance("0xabc");
    expect(out.raw).toBe(1500000n);
    expect(out.formatted).toBe("1.5");
  });
});
