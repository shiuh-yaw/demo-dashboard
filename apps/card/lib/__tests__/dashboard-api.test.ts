import { describe, expect, it, beforeEach, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID", "env-1");
vi.stubEnv("NEXT_PUBLIC_DASHBOARD_URL", "https://dash.test");

beforeEach(() => vi.restoreAllMocks());

describe("dashboardGet", () => {
  it("attaches auth + env headers (from the token argument) and unwraps {success,data}", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: 1 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { dashboardGet } = await import("../dashboard-api");

    const data = await dashboardGet<{ ok: number }>("/api/rain/balance", "tok");

    expect(data).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://dash.test/api/rain/balance");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer tok");
    expect(headers["x-dynamic-environment-id"]).toBe("env-1");
  });

  it("omits the Authorization header when no token is given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: 1 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { dashboardGet } = await import("../dashboard-api");

    await dashboardGet<{ ok: number }>("/api/rain/balance", null);

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("throws with the API error message on non-ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "No card found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const { dashboardGet } = await import("../dashboard-api");
    await expect(dashboardGet("/api/rain/balance", "tok")).rejects.toThrow(
      "No card found",
    );
  });

  it("throws on a 200 response with {success:false,error}", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: "Card not provisioned" }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    );
    const { dashboardGet } = await import("../dashboard-api");
    await expect(dashboardGet("/api/rain/balance", "tok")).rejects.toThrow(
      "Card not provisioned",
    );
  });
});

describe("dashboardPost", () => {
  it("attaches auth + env headers (from the token argument) and sends the body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: 2 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { dashboardPost } = await import("../dashboard-api");

    const data = await dashboardPost<{ ok: number }>(
      "/api/rain/card-details",
      "tok",
      { sessionId: "abc" },
    );

    expect(data).toEqual({ ok: 2 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://dash.test/api/rain/card-details");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer tok");
    expect(headers["x-dynamic-environment-id"]).toBe("env-1");
    expect(init.body).toBe(JSON.stringify({ sessionId: "abc" }));
  });
});
