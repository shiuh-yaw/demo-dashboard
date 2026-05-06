/**
 * Tests for the Redis adapter that exposes `set` with NX + EX semantics
 * to the dedup helper.
 *
 * The dashboard's unified `RedisClient` wraps either Upstash or local
 * ioredis; neither exposes NX through that wrapper today (it's a value-
 * store interface). The adapter calls into the underlying client
 * directly.
 */

import { describe, expect, it } from "vitest";

import { createIoredisDedupAdapter, createUpstashDedupAdapter } from "../redis-adapter";

interface IoredisLike {
  set(
    key: string,
    value: string,
    expiryMode?: "EX",
    seconds?: number,
    flag?: "NX",
  ): Promise<"OK" | null>;
}

interface UpstashLike {
  set(
    key: string,
    value: string,
    options?: { nx?: boolean; ex?: number },
  ): Promise<"OK" | null>;
}

describe("createIoredisDedupAdapter", () => {
  it("translates NX + EX to ioredis positional args and forwards null on conflict", async () => {
    const calls: Array<unknown[]> = [];
    const fake: IoredisLike = {
      async set(...args: unknown[]) {
        calls.push(args);
        // First call wins, subsequent calls return null.
        return calls.length === 1 ? "OK" : null;
      },
    };

    const adapter = createIoredisDedupAdapter(fake);

    const ok = await adapter.set("k", "v", { nx: true, ex: 60 });
    expect(ok).toBe("OK");
    expect(calls[0]).toEqual(["k", "v", "EX", 60, "NX"]);

    const dup = await adapter.set("k", "v", { nx: true, ex: 60 });
    expect(dup).toBeNull();
  });

  it("calls plain set when no options provided", async () => {
    const calls: Array<unknown[]> = [];
    const fake: IoredisLike = {
      async set(...args: unknown[]) {
        calls.push(args);
        return "OK";
      },
    };

    const adapter = createIoredisDedupAdapter(fake);
    await adapter.set("k", "v");
    expect(calls[0]).toEqual(["k", "v"]);
  });
});

describe("createUpstashDedupAdapter", () => {
  it("forwards options object verbatim to upstash client", async () => {
    const calls: Array<unknown[]> = [];
    const fake: UpstashLike = {
      async set(...args) {
        calls.push(args);
        return "OK";
      },
    };

    const adapter = createUpstashDedupAdapter(fake);

    await adapter.set("k", "v", { nx: true, ex: 60 });
    expect(calls[0]).toEqual(["k", "v", { nx: true, ex: 60 }]);
  });
});
