import { describe, it, expect, vi, beforeEach } from "vitest";

const readByConfirmation = vi.fn();
const transition = vi.fn();
const upsertFromCvent = vi.fn();
const postOfflineCharge = vi.fn();

vi.mock("@upstash/qstash/nextjs", () => ({
  verifySignatureAppRouter:
    (handler: (r: Request) => Promise<Response>) =>
      (req: Request) => handler(req),
}));
vi.mock("@/lib/store/order-store", () => ({
  readByConfirmation,
  transition,
  upsertFromCvent,
}));
vi.mock("@/lib/cvent/transactions", () => ({ postOfflineCharge }));

beforeEach(() => {
  readByConfirmation.mockReset();
  transition.mockReset();
  upsertFromCvent.mockReset();
  postOfflineCharge.mockReset();
});

function req(body: unknown) {
  return new Request("http://x/api/internal/worker", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/internal/worker", () => {
  it("transitions to paid on successful Cvent postback", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      cventOrderId: "o1",
      cventAttendeeId: "a1",
      txHash: "0xhash",
      confirmationNumber: "ABC",
    });
    postOfflineCharge.mockResolvedValue({ id: "ctx-1", success: true });
    transition.mockResolvedValue({ status: "paid" });
    const { POST } = await import("./route.js");
    const res = await POST(req({ confirmation: "ABC" }));
    expect(res.status).toBe(200);
    expect(postOfflineCharge).toHaveBeenCalled();
    expect(transition).toHaveBeenCalledWith(
      "ABC",
      ["tx_confirmed"],
      "paid",
      expect.objectContaining({ cventTransactionId: "ctx-1" })
    );
  });

  it("records error and returns 500 on transient Cvent failure", async () => {
    readByConfirmation.mockResolvedValue({
      status: "tx_confirmed",
      cventOrderId: "o1",
      cventAttendeeId: "a1",
      cventPostAttempts: 0,
      confirmationNumber: "ABC",
      amountDue: "10",
      currency: "USD",
    });
    postOfflineCharge.mockRejectedValue(new Error("500 Server Error"));
    const { POST } = await import("./route.js");
    const res = await POST(req({ confirmation: "ABC" }));
    expect(res.status).toBe(500);
    expect(upsertFromCvent).toHaveBeenCalledWith(
      "ABC",
      expect.objectContaining({
        cventPostAttempts: 1,
        cventPostLastError: expect.stringContaining("500"),
      })
    );
  });

  it("no-ops if order is not in tx_confirmed state", async () => {
    readByConfirmation.mockResolvedValue({ status: "paid", confirmationNumber: "ABC" });
    const { POST } = await import("./route.js");
    const res = await POST(req({ confirmation: "ABC" }));
    expect(res.status).toBe(200);
    expect(postOfflineCharge).not.toHaveBeenCalled();
  });

  it("returns 400 on bad body", async () => {
    const { POST } = await import("./route.js");
    const res = await POST(req({ confirmation: "!!!bad" }));
    expect(res.status).toBe(400);
  });
});
