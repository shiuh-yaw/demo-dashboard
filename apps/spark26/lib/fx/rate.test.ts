import { describe, it, expect, beforeEach, vi } from "vitest";

const fetchCoinbaseRate = vi.fn();
const redisGet = vi.fn();
const redisSet = vi.fn();
const updateFx = vi.fn();

vi.mock("./coinbase.js", () => ({ fetchCoinbaseRate }));
vi.mock("@/lib/store/redis-client", () => ({
  redis: () => ({ get: redisGet, set: redisSet }),
}));
vi.mock("@/lib/store/order-store", () => ({ updateFx }));

beforeEach(() => {
  fetchCoinbaseRate.mockReset();
  redisGet.mockReset();
  redisSet.mockReset();
  updateFx.mockReset();
  vi.useRealTimers();
});

describe("lockRate", () => {
  it("short-circuits for USD with identity source and rate 1", async () => {
    const { lockRate } = await import("./rate.js");
    const result = await lockRate("USD");
    expect(result.rate).toBe(1);
    expect(result.source).toBe("identity");
    expect(typeof result.fetchedAt).toBe("string");
    expect(fetchCoinbaseRate).not.toHaveBeenCalled();
    expect(redisGet).not.toHaveBeenCalled();
  });

  it("fetches Coinbase on cache-miss, writes cache with EX 60, returns coinbase source", async () => {
    fetchCoinbaseRate.mockResolvedValue(1.085);
    const { lockRate } = await import("./rate.js");
    const result = await lockRate("EUR");
    expect(result.rate).toBe(1.085);
    expect(result.source).toBe("coinbase");
    expect(fetchCoinbaseRate).toHaveBeenCalledWith("EUR");
    expect(redisSet).toHaveBeenCalledWith(
      "spark26:fx:rate:EUR",
      expect.stringMatching(/"rate":1\.085/),
      "EX",
      60,
    );
  });

  it("falls back to Redis cache when Coinbase fails and cache is < 5 min old", async () => {
    fetchCoinbaseRate.mockRejectedValue(new Error("503"));
    const fetchedAt = new Date(Date.now() - 60_000).toISOString();
    redisGet.mockResolvedValue(JSON.stringify({ rate: 1.079, fetchedAt }));
    const { lockRate } = await import("./rate.js");
    const result = await lockRate("EUR");
    expect(result.rate).toBe(1.079);
    expect(result.source).toBe("cache");
    expect(result.fetchedAt).toBe(fetchedAt);
  });

  it("throws FxUnavailableError when Coinbase fails and cache is stale (> 5 min)", async () => {
    fetchCoinbaseRate.mockRejectedValue(new Error("503"));
    const fetchedAt = new Date(Date.now() - 10 * 60_000).toISOString();
    redisGet.mockResolvedValue(JSON.stringify({ rate: 1.079, fetchedAt }));
    const { lockRate, FxUnavailableError } = await import("./rate.js");
    await expect(lockRate("EUR")).rejects.toBeInstanceOf(FxUnavailableError);
  });

  it("throws FxUnavailableError when Coinbase fails and cache is absent", async () => {
    fetchCoinbaseRate.mockRejectedValue(new Error("503"));
    redisGet.mockResolvedValue(null);
    const { lockRate, FxUnavailableError } = await import("./rate.js");
    await expect(lockRate("EUR")).rejects.toBeInstanceOf(FxUnavailableError);
  });

  it("throws FxUnavailableError when Coinbase fails and cache JSON is malformed", async () => {
    fetchCoinbaseRate.mockRejectedValue(new Error("503"));
    redisGet.mockResolvedValue("not-json");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { lockRate, FxUnavailableError } = await import("./rate.js");
      await expect(lockRate("EUR")).rejects.toBeInstanceOf(FxUnavailableError);
      expect(err).toHaveBeenCalled();
    } finally {
      err.mockRestore();
    }
  });

  it("returns the live Coinbase rate even if the cache write fails", async () => {
    fetchCoinbaseRate.mockResolvedValue(1.09);
    redisSet.mockRejectedValue(new Error("redis down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { lockRate } = await import("./rate.js");
      const result = await lockRate("EUR");
      expect(result.rate).toBe(1.09);
      expect(result.source).toBe("coinbase");
      // Surface the cache-write failure but don't hide the live rate.
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe("lockFxIfMissing", () => {
  const baseOrder = {
    version: 1,
    confirmationNumber: "TEST1",
    cventOrderId: "o1",
    cventAttendeeId: "a1",
    cventEventId: "ev-1",
    amountDue: "50",
    currency: "EUR",
    status: "awaiting_payment" as const,
    settlementChain: "base" as const,
    settlementAsset: "USDC" as const,
    cventPostAttempts: 0,
    createdAt: "2026-04-22T14:00:00.000Z",
    updatedAt: "2026-04-22T14:00:00.000Z",
  };

  it("returns order unchanged when FX fields already present", async () => {
    const order = {
      ...baseOrder,
      amountDueUsd: "54.25",
      fxRate: "1.0850",
      fxSource: "coinbase" as const,
      fxLockedAt: "2026-04-22T14:00:00.000Z",
    };
    const { lockFxIfMissing } = await import("./rate.js");
    const result = await lockFxIfMissing(order);
    expect(result).toBe(order);
    expect(fetchCoinbaseRate).not.toHaveBeenCalled();
    expect(updateFx).not.toHaveBeenCalled();
  });

  it("returns order unchanged when amountDue is 0 (comped attendee)", async () => {
    const order = { ...baseOrder, amountDue: "0" };
    const { lockFxIfMissing } = await import("./rate.js");
    const result = await lockFxIfMissing(order);
    expect(result).toBe(order);
    expect(fetchCoinbaseRate).not.toHaveBeenCalled();
    expect(updateFx).not.toHaveBeenCalled();
  });

  it("calls updateFx and returns updated order when FX fields missing", async () => {
    fetchCoinbaseRate.mockResolvedValue(1.085);
    const updatedOrder = {
      ...baseOrder,
      amountDueUsd: "54.25",
      fxRate: "1.0850",
      fxSource: "coinbase" as const,
      fxLockedAt: "2026-04-22T14:32:00.000Z",
      version: 2,
    };
    updateFx.mockResolvedValue(updatedOrder);
    const { lockFxIfMissing } = await import("./rate.js");
    const result = await lockFxIfMissing(baseOrder);
    expect(fetchCoinbaseRate).toHaveBeenCalledWith("EUR");
    expect(updateFx).toHaveBeenCalledWith(
      "TEST1",
      expect.objectContaining({
        amountDueUsd: "54.25",
        fxRate: "1.0850",
        fxSource: "coinbase",
      }),
    );
    expect(result).toBe(updatedOrder);
  });

  it("swallows FxUnavailableError and returns original order", async () => {
    fetchCoinbaseRate.mockRejectedValue(new Error("503"));
    redisGet.mockResolvedValue(null); // no cache fallback → FxUnavailableError
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { lockFxIfMissing } = await import("./rate.js");
      const result = await lockFxIfMissing(baseOrder);
      expect(result).toBe(baseOrder);
      expect(updateFx).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("resolver-side lock failed"),
        expect.anything(),
      );
    } finally {
      warn.mockRestore();
    }
  });
});
