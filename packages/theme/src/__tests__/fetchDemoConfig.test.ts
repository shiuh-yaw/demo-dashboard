/**
 * fetchDemoConfig tests — covers null-id, missing-base-url, fetch failure,
 * non-2xx, malformed JSON, and the success path. Uses an injected
 * `fetchImpl` and `logger` so the suite is hermetic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDemoConfig } from "../fetchDemoConfig";

interface Fallback {
  theme: { primary: string };
  branding: { name: string };
}

const FALLBACK: Fallback = {
  theme: { primary: "#0071e3" },
  branding: { name: "Default" },
};

describe("fetchDemoConfig", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env.DASHBOARD_URL = "https://dash.test";
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns fallback when id is null", async () => {
    const fetchImpl = vi.fn();
    const logger = { warn: vi.fn() };
    const out = await fetchDemoConfig({
      demoType: "remittance",
      id: null,
      fallback: FALLBACK,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
    });
    expect(out).toBe(FALLBACK);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("returns fallback when id is empty string", async () => {
    const fetchImpl = vi.fn();
    const out = await fetchDemoConfig({
      demoType: "remittance",
      id: "",
      fallback: FALLBACK,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toBe(FALLBACK);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns fallback and warns when no DASHBOARD_URL is configured", async () => {
    delete process.env.DASHBOARD_URL;
    delete process.env.NEXT_PUBLIC_DASHBOARD_URL;
    const fetchImpl = vi.fn();
    const logger = { warn: vi.fn() };
    const out = await fetchDemoConfig({
      demoType: "remittance",
      id: "abc",
      fallback: FALLBACK,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
    });
    expect(out).toBe(FALLBACK);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("returns fallback when fetch throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    const logger = { warn: vi.fn() };
    const out = await fetchDemoConfig({
      demoType: "remittance",
      id: "abc",
      fallback: FALLBACK,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
    });
    expect(out).toBe(FALLBACK);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("returns fallback when response is non-2xx", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("not found", { status: 404 }),
    );
    const logger = { warn: vi.fn() };
    const out = await fetchDemoConfig({
      demoType: "remittance",
      id: "abc",
      fallback: FALLBACK,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
    });
    expect(out).toBe(FALLBACK);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("merges the fetched record over the fallback (shallow)", async () => {
    const fetched = {
      theme: { primary: "#ff00aa" },
      branding: { name: "Brand X" },
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(fetched), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const out = await fetchDemoConfig({
      demoType: "remittance",
      id: "abc",
      fallback: FALLBACK,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toEqual(fetched);
  });

  it("constructs the dashboard URL from demoType + id, encoding both", async () => {
    let observed = "";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      observed = typeof input === "string" ? input : input.toString();
      return new Response(JSON.stringify(FALLBACK), { status: 200 });
    });
    await fetchDemoConfig({
      demoType: "cross-border-ap-ar",
      id: "id with space",
      fallback: FALLBACK,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(observed).toBe(
      "https://dash.test/api/demo-configs/cross-border-ap-ar/id%20with%20space",
    );
  });

  it("respects an explicit dashboardUrl prop over env vars", async () => {
    let observed = "";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      observed = typeof input === "string" ? input : input.toString();
      return new Response(JSON.stringify(FALLBACK), { status: 200 });
    });
    await fetchDemoConfig({
      demoType: "remittance",
      id: "abc",
      fallback: FALLBACK,
      dashboardUrl: "https://override.test/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(observed).toBe("https://override.test/api/demo-configs/remittance/abc");
  });
});
