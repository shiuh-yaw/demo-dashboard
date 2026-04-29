import { describe, it, expect, vi, beforeEach } from "vitest";

const resolveOrderState = vi.fn();
const confirmationLimit = vi.fn();
const ipLimit = vi.fn();

vi.mock("@/lib/resolve-order-state", () => ({ resolveOrderState }));
vi.mock("@/lib/upstash/ratelimit", () => ({
  confirmationLimiter: () => ({ limit: confirmationLimit }),
  ipLimiter: () => ({ limit: ipLimit }),
}));

beforeEach(() => {
  resolveOrderState.mockReset();
  confirmationLimit.mockReset().mockResolvedValue({ success: true });
  ipLimit.mockReset().mockResolvedValue({ success: true });
});

function makeReq(url: string) {
  return new Request(url, {
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

describe("GET /api/orders/[confirmation]/status", () => {
  it("returns narrow projection of resolved state", async () => {
    resolveOrderState.mockResolvedValue({
      kind: "pending",
      order: {
        status: "tx_in_flight",
        amountDue: "10",
        currency: "USD",
        attendeeName: "Ada",
        updatedAt: "2026-04-21T00:00:00Z",
      },
    });
    const { GET } = await import("./route.js");
    const res = await GET(makeReq("http://x/api/orders/ABC/status"), {
      params: Promise.resolve({ confirmation: "ABC" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      status: "tx_in_flight",
      amountDue: "10",
      currency: "USD",
      attendeeName: "Ada",
      updatedAt: "2026-04-21T00:00:00Z",
    });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 404 when order is not found", async () => {
    resolveOrderState.mockResolvedValue({ kind: "not_found" });
    const { GET } = await import("./route.js");
    const res = await GET(makeReq("http://x/api/orders/ABC/status"), {
      params: Promise.resolve({ confirmation: "ABC" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 429 when rate-limited", async () => {
    confirmationLimit.mockResolvedValue({ success: false });
    const { GET } = await import("./route.js");
    const res = await GET(makeReq("http://x/api/orders/ABC/status"), {
      params: Promise.resolve({ confirmation: "ABC" }),
    });
    expect(res.status).toBe(429);
    expect(resolveOrderState).not.toHaveBeenCalled();
  });

  it("returns 400 on malformed confirmation", async () => {
    const { GET } = await import("./route.js");
    const res = await GET(makeReq("http://x/api/orders/!!!/status"), {
      params: Promise.resolve({ confirmation: "!!!" }),
    });
    expect(res.status).toBe(400);
    expect(resolveOrderState).not.toHaveBeenCalled();
  });
});
