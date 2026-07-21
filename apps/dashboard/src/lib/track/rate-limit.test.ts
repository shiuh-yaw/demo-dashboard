import { describe, expect, it, vi } from "vitest";

import {
  createFixedWindowRateLimiter,
  createLazyRateLimiter,
  type TrackRateLimitClient,
} from "./rate-limit";

function createFakeRateLimitClient(): TrackRateLimitClient {
  const counts = new Map<string, number>();
  return {
    async incr(key) {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    async expire() {
      return 1;
    },
  };
}

describe("createFixedWindowRateLimiter", () => {
  it("allows requests under the limit", async () => {
    const client = createFakeRateLimitClient();
    const limiter = createFixedWindowRateLimiter(client, {
      limit: 3,
      windowSeconds: 60,
    });
    expect((await limiter.limit("id-1")).success).toBe(true);
    expect((await limiter.limit("id-1")).success).toBe(true);
    expect((await limiter.limit("id-1")).success).toBe(true);
  });

  it("rejects once the limit is exceeded within the window", async () => {
    const client = createFakeRateLimitClient();
    const limiter = createFixedWindowRateLimiter(client, {
      limit: 2,
      windowSeconds: 60,
    });
    expect((await limiter.limit("id-2")).success).toBe(true);
    expect((await limiter.limit("id-2")).success).toBe(true);
    expect((await limiter.limit("id-2")).success).toBe(false);
  });

  it("sets a TTL on the first hit in a window", async () => {
    const client = createFakeRateLimitClient();
    const expireSpy = vi.spyOn(client, "expire");
    const limiter = createFixedWindowRateLimiter(client, {
      limit: 5,
      windowSeconds: 60,
    });
    await limiter.limit("id-3");
    await limiter.limit("id-3");
    expect(expireSpy).toHaveBeenCalledTimes(1);
    expect(expireSpy).toHaveBeenCalledWith(expect.stringContaining("id-3"), 60);
  });

  it("tracks distinct identifiers independently", async () => {
    const client = createFakeRateLimitClient();
    const limiter = createFixedWindowRateLimiter(client, {
      limit: 1,
      windowSeconds: 60,
    });
    expect((await limiter.limit("a")).success).toBe(true);
    expect((await limiter.limit("b")).success).toBe(true);
    expect((await limiter.limit("a")).success).toBe(false);
  });
});

describe("createLazyRateLimiter (M2 - deferred client init)", () => {
  it("does not call the client factory until the first limit() call", () => {
    const factory = vi.fn(createFakeRateLimitClient);
    createLazyRateLimiter(factory, { limit: 5, windowSeconds: 60 });
    expect(factory).not.toHaveBeenCalled();
  });

  it("calls the client factory exactly once even across many limit() calls", async () => {
    const factory = vi.fn(createFakeRateLimitClient);
    const limiter = createLazyRateLimiter(factory, {
      limit: 5,
      windowSeconds: 60,
    });
    await limiter.limit("a");
    await limiter.limit("a");
    await limiter.limit("b");
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("enforces the underlying fixed-window limit once initialized", async () => {
    const limiter = createLazyRateLimiter(createFakeRateLimitClient, {
      limit: 1,
      windowSeconds: 60,
    });
    expect((await limiter.limit("id")).success).toBe(true);
    expect((await limiter.limit("id")).success).toBe(false);
  });
});
