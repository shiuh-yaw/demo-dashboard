import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";

let previousDispatcher: ReturnType<typeof getGlobalDispatcher>;
let mockAgent: MockAgent;

beforeEach(() => {
  previousDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
  await mockAgent.close();
  setGlobalDispatcher(previousDispatcher);
});

describe("fetchCoinbaseRate", () => {
  it("returns the USD rate as a number on a valid response", async () => {
    const pool = mockAgent.get("https://api.coinbase.com");
    pool
      .intercept({ path: "/v2/exchange-rates?currency=EUR", method: "GET" })
      .reply(200, {
        data: { currency: "EUR", rates: { USD: "1.0850", GBP: "0.85" } },
      });
    const { fetchCoinbaseRate } = await import("./coinbase.js");
    const rate = await fetchCoinbaseRate("EUR");
    expect(rate).toBe(1.085);
  });

  it("throws on non-2xx status", async () => {
    const pool = mockAgent.get("https://api.coinbase.com");
    pool
      .intercept({ path: "/v2/exchange-rates?currency=EUR", method: "GET" })
      .reply(503, { error: "unavailable" });
    const { fetchCoinbaseRate } = await import("./coinbase.js");
    await expect(fetchCoinbaseRate("EUR")).rejects.toThrow(/503/);
  });

  it("throws when response is missing rates.USD", async () => {
    const pool = mockAgent.get("https://api.coinbase.com");
    pool
      .intercept({ path: "/v2/exchange-rates?currency=EUR", method: "GET" })
      .reply(200, { data: { currency: "EUR", rates: { GBP: "0.85" } } });
    const { fetchCoinbaseRate } = await import("./coinbase.js");
    await expect(fetchCoinbaseRate("EUR")).rejects.toThrow(/rates\.USD/i);
  });

  it("throws when rate is not a finite positive number", async () => {
    const pool = mockAgent.get("https://api.coinbase.com");
    pool
      .intercept({ path: "/v2/exchange-rates?currency=EUR", method: "GET" })
      .reply(200, { data: { currency: "EUR", rates: { USD: "not-a-number" } } });
    const { fetchCoinbaseRate } = await import("./coinbase.js");
    await expect(fetchCoinbaseRate("EUR")).rejects.toThrow(/invalid rate/i);
  });

  it("throws when rate is outside the EUR/USD sanity band", async () => {
    const pool = mockAgent.get("https://api.coinbase.com");
    pool
      .intercept({ path: "/v2/exchange-rates?currency=EUR", method: "GET" })
      .reply(200, { data: { currency: "EUR", rates: { USD: "0.01" } } });
    const { fetchCoinbaseRate } = await import("./coinbase.js");
    await expect(fetchCoinbaseRate("EUR")).rejects.toThrow(/out of band/i);
  });

  it("throws when the request exceeds the timeout", async () => {
    // Patch global fetch with a function that hangs forever so AbortSignal.timeout
    // is the only thing that can resolve the race. Fake timers let us advance
    // past the 3-second production constant without actually waiting.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject((init.signal as AbortSignal).reason),
        );
      });

    vi.useFakeTimers();
    try {
      const { fetchCoinbaseRate } = await import("./coinbase.js");
      const racePromise = fetchCoinbaseRate("EUR");
      await vi.advanceTimersByTimeAsync(3100);
      await expect(racePromise).rejects.toThrow(/abort|timeout/i);
    } finally {
      vi.useRealTimers();
      globalThis.fetch = originalFetch;
    }
  }, 10_000);
});
