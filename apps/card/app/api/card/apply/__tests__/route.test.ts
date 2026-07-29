import { describe, expect, it, vi, beforeEach } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);
vi.stubEnv("DASHBOARD_URL", "https://dash.test");

const body = {
  firstName: "Ada",
  birthDate: "1990-01-01",
  nationalId: "123456789",
  phoneNumber: "5551234567",
  address: { line1: "1 St", city: "NYC", region: "NY", postalCode: "10001", countryCode: "US" },
  occupation: "engineer",
  annualSalary: "100000",
  accountPurpose: "personal",
  expectedMonthlyVolume: "1000",
  isTermsOfServiceAccepted: true,
};

function req(overrides?: Partial<typeof body>) {
  return new Request("http://localhost/api/card/apply", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "x-dynamic-environment-id": "env-1",
    },
    body: JSON.stringify({ ...body, ...overrides }),
  });
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("POST /api/card/apply", () => {
  it("forwards to the dashboard and returns the created card (no server-side persistence)", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { card: { id: "c1", userId: "u1" } } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const { POST } = await import("../route");
    const res = await POST(req());
    const json = await res.json();

    // The route only forwards; storage is the client's job (useRainCardStore).
    expect(fetchMock.mock.calls[0]![0]).toBe("https://dash.test/api/rain/apply");
    expect(res.status).toBe(200);
    expect(json.card).toMatchObject({ id: "c1", userId: "u1" });
  });

  it("surfaces the dashboard's error status when the forward fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "denied" }), {
        status: 422,
        headers: { "content-type": "application/json" },
      }),
    );
    const { POST } = await import("../route");
    const res = await POST(req());
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.error).toBe("denied");
  });

  it("returns 400 and never fetches when the body fails schema validation", async () => {
    const { POST } = await import("../route");
    const res = await POST(req({ isTermsOfServiceAccepted: false }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
