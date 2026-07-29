import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { RainApiError } from "@dynamic-demos/rain";

// The real (unmocked) route export types require a NextRequest + a
// RouteContext second arg; the mocked withAuth below ignores the context, but
// tsc still checks calls against the real module's types.
const routeContext = { params: Promise.resolve({}) };

const { rainClient } = vi.hoisted(() => ({
  rainClient: { get: vi.fn(), post: vi.fn() },
}));

// Auth boundary: withAuth passes the request straight through to the handler.
// The card is no longer resolved from the user - it rides the request headers
// (see getRainCardFromRequest), so the handler only needs the req.
vi.mock("@/lib/dynamic/dynamic-auth", () => ({
  withAuth:
    (handler: (req: Request) => unknown) =>
    (req: Request) =>
      handler(req),
}));

vi.mock("@/lib/rain/client", () => ({
  getRainClient: () => rainClient,
}));

/** A request carrying the card ids the app would send. */
function withCardHeaders(
  url: string,
  init: { method?: string; body?: string } = {},
): NextRequest {
  return new NextRequest(url, {
    method: init.method,
    body: init.body,
    headers: {
      "x-rain-card-id": "card_1",
      "x-rain-user-id": "ruser_1",
    },
  });
}

beforeEach(() => {
  rainClient.get.mockReset();
  rainClient.post.mockReset();
});

describe("/api/rain/balance", () => {
  it("returns the Rain balance for the card ids on the request", async () => {
    rainClient.get.mockResolvedValue({ spendingPower: 100 });
    const { GET } = await import("../balance/route");

    const res = await GET(
      withCardHeaders("http://localhost/api/rain/balance"),
      routeContext,
    );
    const body = await res.json();

    expect(rainClient.get).toHaveBeenCalledWith(
      "/v1/issuing/users/ruser_1/balances",
    );
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: { spendingPower: 100 } });
  });

  it("400s when the card headers are missing", async () => {
    const { GET } = await import("../balance/route");

    const res = await GET(
      new NextRequest("http://localhost/api/rain/balance"),
      routeContext,
    );
    expect(res.status).toBe(400);
  });

  it("surfaces Rain's real status code instead of a generic 500", async () => {
    rainClient.get.mockRejectedValue(
      new RainApiError("denied", 422, { reason: "kyc_failed" }),
    );
    const { GET } = await import("../balance/route");

    const res = await GET(
      withCardHeaders("http://localhost/api/rain/balance"),
      routeContext,
    );
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("denied");
    expect(body.code).toBe("RAIN_ERROR");
  });
});

describe("/api/rain/card-details", () => {
  it("proxies the sessionId and returns Rain's ciphertext for the header card id", async () => {
    rainClient.get.mockResolvedValue({ encryptedPan: { iv: "i", data: "d" } });
    const { POST } = await import("../card-details/route");

    const res = await POST(
      withCardHeaders("http://localhost/api/rain/card-details", {
        method: "POST",
        body: JSON.stringify({ sessionId: "sess-1" }),
      }),
      routeContext,
    );

    expect(rainClient.get).toHaveBeenCalledWith(
      "/v1/issuing/cards/card_1/secrets",
      { SessionId: "sess-1" },
    );
    expect(res.status).toBe(200);
  });

  it("400s when sessionId is missing", async () => {
    const { POST } = await import("../card-details/route");
    const res = await POST(
      withCardHeaders("http://localhost/api/rain/card-details", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      routeContext,
    );
    expect(res.status).toBe(400);
  });
});
