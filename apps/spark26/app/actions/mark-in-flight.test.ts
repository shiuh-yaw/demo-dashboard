import { describe, it, expect, vi, beforeEach } from "vitest";

const readOrReseed = vi.fn();
const transition = vi.fn();

vi.mock("@/lib/resolve-order-state", () => ({ readOrReseed }));
vi.mock("@/lib/store/order-store", () => ({ transition }));

beforeEach(() => {
  readOrReseed.mockReset();
  transition.mockReset();
});

const TX_ID = "3d7c0c7f-76de-4e4a-ae34-36ef123281f3";

describe("markInFlightAction", () => {
  it("transitions from checkout_ready to tx_in_flight, recording the transactionId", async () => {
    readOrReseed.mockResolvedValue({
      status: "checkout_ready",
      dynamicCheckoutId: "chk-1",
    });
    transition.mockResolvedValue({ status: "tx_in_flight" });
    const { markInFlightAction } = await import("./mark-in-flight.js");
    const result = await markInFlightAction("ABC", TX_ID);
    expect(transition).toHaveBeenCalledWith(
      "ABC",
      ["checkout_ready"],
      "tx_in_flight",
      { dynamicTransactionId: TX_ID }
    );
    expect(result.status).toBe("tx_in_flight");
  });

  it("rejects clearly when the record is missing a checkoutId (re-seed without prior create)", async () => {
    readOrReseed.mockResolvedValue({
      status: "awaiting_payment",
      // no dynamicCheckoutId
    });
    const { markInFlightAction } = await import("./mark-in-flight.js");
    await expect(markInFlightAction("ABC", TX_ID)).rejects.toThrow(
      /no active checkout|session was lost|refresh/i
    );
  });

  it("rejects when neither Redis nor Cvent knows the order", async () => {
    readOrReseed.mockResolvedValue(null);
    const { markInFlightAction } = await import("./mark-in-flight.js");
    await expect(markInFlightAction("BOGUS", TX_ID)).rejects.toThrow(
      /not found/i
    );
  });

  it("rejects malformed confirmation/tx inputs before any I/O", async () => {
    const { markInFlightAction } = await import("./mark-in-flight.js");
    await expect(
      markInFlightAction("../etc/passwd", TX_ID),
    ).rejects.toThrow(/invalid confirmation/i);
    await expect(
      markInFlightAction("ABC", "not-a-uuid"),
    ).rejects.toThrow(/invalid transaction/i);
    expect(readOrReseed).not.toHaveBeenCalled();
  });
});
