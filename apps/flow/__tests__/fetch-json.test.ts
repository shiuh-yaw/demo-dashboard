import { describe, it, expect, vi, afterEach } from "vitest";

import { fetchJson } from "../lib/fetch-json";

function mockFetch(impl: () => Promise<Response> | Response) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchJson", () => {
  it("returns parsed data on a 200 JSON response", async () => {
    mockFetch(() => new Response(JSON.stringify({ accessToken: "tok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const res = await fetchJson<{ accessToken: string }>("/api/x");
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data?.accessToken).toBe("tok");
  });

  it("surfaces a structured JSON error on a non-OK response", async () => {
    mockFetch(() => new Response(JSON.stringify({ error: "Level not found" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    }));
    const res = await fetchJson("/api/x");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(502);
    expect(res.error).toBe("Level not found");
  });

  it("does NOT throw on an HTML error page — surfaces status + snippet", async () => {
    mockFetch(() => new Response("<!DOCTYPE html><html><body>500</body></html>", {
      status: 500,
      headers: { "content-type": "text/html" },
    }));
    const res = await fetchJson("/api/x");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
    expect(res.error).toContain("500");
    // The cryptic "Unexpected token '<'" must never surface.
    expect(res.error).not.toContain("Unexpected token");
  });

  it("handles a network-level failure (no response)", async () => {
    mockFetch(() => Promise.reject(new Error("Failed to fetch")));
    const res = await fetchJson("/api/x");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(0);
    expect(res.error).toBe("Failed to fetch");
  });
});
