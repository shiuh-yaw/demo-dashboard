import { describe, expect, it, vi } from "vitest";

import { RainApiError, RainClient } from "../client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("RainClient", () => {
  it("joins the base URL, sets auth headers, and returns parsed JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new RainClient({
      baseUrl: "https://rain.test",
      apiKey: "key-123",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await client.get<{ ok: boolean }>("/v1/thing");

    expect(result).toEqual({ ok: true });
    const call = fetchImpl.mock.calls[0] as [string, RequestInit];
    const [url, init] = call;
    expect(url).toBe("https://rain.test/v1/thing");
    const headers = init.headers as Record<string, string>;
    expect(headers["Api-Key"]).toBe("key-123");
    // Rain uses Api-Key only - no Authorization header.
    expect(headers["Authorization"]).toBeUndefined();
    expect(init.cache).toBe("no-store");
  });

  it("normalizes a path that already has no leading slash", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const client = new RainClient({
      baseUrl: "https://rain.test/",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.get("v1/thing");

    expect((fetchImpl.mock.calls[0] as [string, RequestInit])[0]).toBe("https://rain.test/v1/thing");
  });

  it("passes extra GET headers through (e.g. SessionId)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const client = new RainClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.get("/v1/x", { SessionId: "sess" });

    const headers = ((fetchImpl.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>);
    expect(headers["SessionId"]).toBe("sess");
  });

  it("throws RainApiError with status + details on a non-2xx response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "nope" }, 422));
    const client = new RainClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.get("/v1/x")).rejects.toMatchObject({
      name: "RainApiError",
      status: 422,
      message: "nope",
    });
  });

  it("defaults the base URL to the sandbox host", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const client = new RainClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.get("/v1/x");

    expect((fetchImpl.mock.calls[0] as [string, RequestInit])[0]).toBe(
      "https://api-dev.raincards.xyz/v1/x",
    );
  });
});

it("RainApiError is an Error carrying status + details", () => {
  const err = new RainApiError("boom", 500, { a: 1 });
  expect(err).toBeInstanceOf(Error);
  expect(err.status).toBe(500);
  expect(err.details).toEqual({ a: 1 });
});
