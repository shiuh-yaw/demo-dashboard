import { describe, it, expect, vi, beforeEach } from "vitest";

const scanMock = vi.fn();
const mgetMock = vi.fn();

vi.mock("@/lib/store/redis-client", () => ({
  redis: () => ({ scan: scanMock, mget: mgetMock }),
}));

beforeEach(() => {
  scanMock.mockReset();
  mgetMock.mockReset();
});

describe("listAllOrders", () => {
  it("returns parsed orders from all scanned keys", async () => {
    // Two SCAN pages: first returns cursor=42, then cursor=0 to stop.
    scanMock
      .mockResolvedValueOnce(["42", ["spark26:order:A", "spark26:order:B"]])
      .mockResolvedValueOnce(["0", ["spark26:order:C"]]);
    mgetMock
      .mockResolvedValueOnce([
        JSON.stringify({ confirmationNumber: "A", status: "paid" }),
        JSON.stringify({ confirmationNumber: "B", status: "tx_confirmed" }),
      ])
      .mockResolvedValueOnce([
        JSON.stringify({ confirmationNumber: "C", status: "awaiting_payment" }),
      ]);
    const { listAllOrders } = await import("./all-orders.js");
    const out = await listAllOrders();
    expect(out.map(o => o.confirmationNumber).sort()).toEqual(["A", "B", "C"]);
  });

  it("returns empty list when no keys match", async () => {
    scanMock.mockResolvedValueOnce(["0", []]);
    const { listAllOrders } = await import("./all-orders.js");
    const out = await listAllOrders();
    expect(out).toEqual([]);
  });

  it("skips null/corrupt entries without throwing", async () => {
    scanMock.mockResolvedValueOnce(["0", ["spark26:order:X", "spark26:order:Y", "spark26:order:Z"]]);
    mgetMock.mockResolvedValueOnce([
      null,
      "{not valid json",
      JSON.stringify({ confirmationNumber: "Z", status: "paid" }),
    ]);
    const { listAllOrders } = await import("./all-orders.js");
    const out = await listAllOrders();
    expect(out.map(o => o.confirmationNumber)).toEqual(["Z"]);
  });
});
