import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    CVENT_EVENT_ID: "ev-1",
    CVENT_CLIENT_ID: "client",
    CVENT_CLIENT_SECRET: "secret",
    CVENT_BASE_URL: "https://api-platform.cvent.com",
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  // The token cache lives on globalThis (so HMR doesn't clobber it in dev);
  // clear it explicitly between tests because vi.resetModules alone won't
  // touch globals. Drop any cached token so each test mints anew.
  delete (globalThis as { __spark26CventToken?: unknown }).__spark26CventToken;
  vi.resetModules();
});

function mockTokenResponse() {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ access_token: "tok-1", expires_in: 3600 }),
  });
}

describe("postOfflineCharge", () => {
  it("posts event + attendee + orders + payment details to Cvent and returns the parsed response", async () => {
    mockTokenResponse();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: "tx-1", success: true }),
    });

    const { postOfflineCharge } = await import("./transactions.js");
    const paidAt = new Date("2026-04-21T10:00:00Z");
    const result = await postOfflineCharge({
      attendeeId: "a1",
      orderId: "o1",
      paidAt,
      reference: "spark26:ABC123:0xhash",
    });
    expect(result).toEqual({ id: "tx-1", success: true });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api-platform.cvent.com/ea/oauth2/token",
    );

    const [postUrl, postInit] = fetchMock.mock.calls[1] ?? [];
    expect(postUrl).toBe(
      "https://api-platform.cvent.com/ea/events/ev-1/transactions?partialPayment=false",
    );
    const init = postInit as { method: string; headers: Record<string, string>; body: string };
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer tok-1",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body)).toMatchObject({
      event: { id: "ev-1" },
      attendee: { id: "a1" },
      orders: [{ id: "o1" }],
      paymentType: "Offline Charge",
      paymentMethod: "Other",
      date: paidAt.toISOString(),
      referenceNumber: "spark26:ABC123:0xhash",
    });
  });

  it("throws with status + body when Cvent returns a non-2xx", async () => {
    mockTokenResponse();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => '{"error":{"code":"Too Many Requests"}}',
    });

    const { postOfflineCharge } = await import("./transactions.js");
    await expect(
      postOfflineCharge({
        attendeeId: "a1",
        orderId: "o1",
        paidAt: new Date(),
        reference: "x",
      }),
    ).rejects.toThrow(/429/);
  });

  it("no-ops for the banana fixture attendee in non-production", async () => {
    const { postOfflineCharge } = await import("./transactions.js");
    const result = await postOfflineCharge({
      attendeeId: "banana-attendee",
      orderId: "banana-order",
      paidAt: new Date(),
      reference: "spark26:banana:0xhash",
    });
    expect(result).toMatchObject({ success: true });
    expect((result as { id?: string }).id).toMatch(/^banana-tx-/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
