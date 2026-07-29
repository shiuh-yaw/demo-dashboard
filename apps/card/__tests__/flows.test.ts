import { describe, it, expect, vi } from "vitest";
import { trackedDeposit } from "../lib/analytics/flows";

describe("trackedDeposit", () => {
  it("fires deposit_initiated then deposit_completed on a successful deposit", async () => {
    const milestone = vi.fn();
    const result = await trackedDeposit(milestone, "10", async () => "0xhash");

    expect(result).toBe("0xhash");
    expect(milestone).toHaveBeenNthCalledWith(1, "deposit_initiated", {
      amount: "10",
    });
    expect(milestone).toHaveBeenNthCalledWith(2, "deposit_completed", {
      amount: "10",
    });
    expect(milestone).toHaveBeenCalledTimes(2);
  });

  it("fires deposit_initiated but NOT deposit_completed when the deposit fails", async () => {
    const milestone = vi.fn();

    await expect(
      trackedDeposit(milestone, "10", async () => {
        throw new Error("deposit failed");
      }),
    ).rejects.toThrow("deposit failed");

    expect(milestone).toHaveBeenCalledTimes(1);
    expect(milestone).toHaveBeenCalledWith("deposit_initiated", {
      amount: "10",
    });
  });
});
