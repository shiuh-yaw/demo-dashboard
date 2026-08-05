/**
 * fetchDemoConfig tests - covers null-id, missing-base-url, fetch failure,
 * non-2xx, malformed JSON, and the success path. Uses an injected
 * `fetchImpl` and `logger` so the suite is hermetic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDemoConfig, fetchDemoConfigResult } from "../fetchDemoConfig";

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

  it("falls back to the dev dashboard when no url is configured outside production", async () => {
    // Local dev needs no env var. Every app previously had to name the URL, and
    // naming it with a key not on the sniff list rendered the DEFAULT palette
    // under branded chrome - `isBranded` comes from the theme cookie, not this
    // fetch. Silence beats a warning here: this is the expected local path.
    delete process.env.DASHBOARD_URL;
    delete process.env.NEXT_PUBLIC_DASHBOARD_URL;
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ theme: { primaryColor: "#123456" } }),
    }));
    const logger = { warn: vi.fn() };
    await fetchDemoConfig({
      demoType: "remittance",
      id: "abc",
      fallback: FALLBACK,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:4000/api/demo-configs/remittance/abc",
      expect.anything(),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("returns fallback and warns when no url is configured IN production", async () => {
    // Production stays strict - guessing localhost there would hide a real
    // misconfiguration behind a connection error.
    delete process.env.DASHBOARD_URL;
    delete process.env.NEXT_PUBLIC_DASHBOARD_URL;
    const prev = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    try {
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
    } finally {
      Object.defineProperty(process.env, "NODE_ENV", { value: prev, configurable: true });
    }
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

/**
 * `resolved` is what branded-vs-unbranded chrome keys off. Every path that
 * returns the fallback must report false: a caller that instead derives
 * branding from the presence of a config id renders branded chrome over an
 * unbranded page whenever the fetch fails.
 */
describe("fetchDemoConfigResult - resolved flag", () => {
  const originalEnv = { ...process.env };
  const logger = { warn: vi.fn() };
  beforeEach(() => {
    process.env.DASHBOARD_URL = "https://dash.test";
    logger.warn.mockClear();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  const unresolvedCases: Array<[string, () => Parameters<typeof fetchDemoConfigResult<Fallback>>[0]]> = [
    ["id is null", () => ({ demoType: "trade", id: null, fallback: FALLBACK })],
    ["id is empty", () => ({ demoType: "trade", id: "", fallback: FALLBACK })],
    [
      "no dashboard url is resolvable",
      () => {
        delete process.env.DASHBOARD_URL;
        process.env.NODE_ENV = "production";
        return { demoType: "trade", id: "abc", fallback: FALLBACK, logger };
      },
    ],
    [
      "the response is non-2xx",
      () => ({
        demoType: "trade",
        id: "abc",
        fallback: FALLBACK,
        logger,
        fetchImpl: vi.fn(async () => new Response("nope", { status: 400 })) as unknown as typeof fetch,
      }),
    ],
    [
      "the fetch throws",
      () => ({
        demoType: "trade",
        id: "abc",
        fallback: FALLBACK,
        logger,
        fetchImpl: vi.fn(async () => {
          throw new Error("network down");
        }) as unknown as typeof fetch,
      }),
    ],
    [
      "the payload is not an object",
      () => ({
        demoType: "trade",
        id: "abc",
        fallback: FALLBACK,
        logger,
        fetchImpl: vi.fn(async () => new Response("null", { status: 200 })) as unknown as typeof fetch,
      }),
    ],
  ];

  it.each(unresolvedCases)("reports resolved=false when %s", async (_name, build) => {
    const { config, resolved } = await fetchDemoConfigResult<Fallback>(build());
    expect(resolved).toBe(false);
    expect(config).toBe(FALLBACK);
  });

  it("reports resolved=true and merges over the fallback on success", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ branding: { name: "Acme" } }), { status: 200 }),
    );
    const { config, resolved } = await fetchDemoConfigResult<Fallback>({
      demoType: "trade",
      id: "abc",
      fallback: FALLBACK,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(resolved).toBe(true);
    expect(config.branding.name).toBe("Acme");
    // Untouched top-level keys survive the shallow merge.
    expect(config.theme).toEqual(FALLBACK.theme);
    // A merged result must not be the fallback object itself.
    expect(config).not.toBe(FALLBACK);
  });

  it("unwraps the dashboard's { success, data } envelope and still resolves", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ success: true, data: { branding: { name: "Acme" } } }),
        { status: 200 },
      ),
    );
    const { config, resolved } = await fetchDemoConfigResult<Fallback>({
      demoType: "trade",
      id: "abc",
      fallback: FALLBACK,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(resolved).toBe(true);
    expect(config.branding.name).toBe("Acme");
  });

  it("fetchDemoConfig returns the same config as the result variant", async () => {
    const payload = { branding: { name: "Acme" } };
    const makeFetch = () =>
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })) as unknown as typeof fetch;

    const plain = await fetchDemoConfig<Fallback>({
      demoType: "trade",
      id: "abc",
      fallback: FALLBACK,
      fetchImpl: makeFetch(),
    });
    const { config } = await fetchDemoConfigResult<Fallback>({
      demoType: "trade",
      id: "abc",
      fallback: FALLBACK,
      fetchImpl: makeFetch(),
    });
    expect(plain).toEqual(config);
  });
});
