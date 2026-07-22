import { describe, it, expect, vi } from "vitest";
import { trackedSend, trackedBackup } from "../lib/analytics/flows";

describe("trackedSend", () => {
  it("fires send_initiated then send_completed on a successful send", async () => {
    const milestone = vi.fn();
    const result = await trackedSend(milestone, "USDC", "10", async () => "0xhash");

    expect(result).toBe("0xhash");
    expect(milestone).toHaveBeenNthCalledWith(1, "send_initiated", {
      asset: "USDC",
      amount: "10",
    });
    expect(milestone).toHaveBeenNthCalledWith(2, "send_completed", {
      asset: "USDC",
      amount: "10",
    });
    expect(milestone).toHaveBeenCalledTimes(2);
  });

  it("fires send_initiated but NOT send_completed when the send fails", async () => {
    const milestone = vi.fn();

    await expect(
      trackedSend(milestone, "USDC", "10", async () => {
        throw new Error("send failed");
      }),
    ).rejects.toThrow("send failed");

    expect(milestone).toHaveBeenCalledTimes(1);
    expect(milestone).toHaveBeenCalledWith("send_initiated", {
      asset: "USDC",
      amount: "10",
    });
  });
});

describe("trackedBackup", () => {
  it("fires backup_completed after a successful backup", async () => {
    const milestone = vi.fn();
    const result = await trackedBackup(milestone, async () => "ok");

    expect(result).toBe("ok");
    expect(milestone).toHaveBeenCalledTimes(1);
    expect(milestone).toHaveBeenCalledWith("backup_completed");
  });

  it("does NOT fire backup_completed when the backup fails", async () => {
    const milestone = vi.fn();

    await expect(
      trackedBackup(milestone, async () => {
        throw new Error("backup failed");
      }),
    ).rejects.toThrow("backup failed");

    expect(milestone).not.toHaveBeenCalled();
  });
});
