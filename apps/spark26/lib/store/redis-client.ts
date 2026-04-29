import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis, { type Redis as IORedisClient } from "ioredis";
import { env } from "@/lib/env";

export type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: "EX" | "PX" | "NX", ttl?: number): Promise<"OK" | null>;
  del(key: string): Promise<number>;
  setnx(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  /**
   * Atomic SET with NX (no-TTL). Returns true iff the key did not exist and
   * was set. Distinct from `setnx` (which requires a TTL, used for locks):
   * order records persist without expiry, but the create path still needs
   * atomic no-overwrite semantics so a stale null GET can't clobber a
   * concurrently-written record.
   */
  setIfAbsent(key: string, value: string): Promise<boolean>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, member: string): Promise<number>;
  zrangebyscore(key: string, min: number, max: number): Promise<string[]>;
  /** SCAN cursor with MATCH pattern and COUNT hint. Returns [nextCursor, keys]. */
  scan(cursor: string, match: string, count: number): Promise<[string, string[]]>;
  /** Fetch multiple string values by key. Absent/null entries stay null. */
  mget(...keys: string[]): Promise<(string | null)[]>;
};

// Pin the wrapped client AND the underlying Upstash client on globalThis so:
// (a) Next.js webpack compiles `(rsc)` and `(action-browser)` bundles with
//     separate module graphs — without pinning, each bundle gets its own
//     singleton AND its own `UpstashRedis` instance. The Upstash SDK tracks
//     read-your-writes sync tokens per-client-instance; reads without the
//     write's sync token hit a lagging replica and return stale data.
//     Sharing one instance across bundles keeps the sync token coherent so a
//     write in a server action is visible to the subsequent page render.
// (b) HMR recompiles in dev don't wipe the sync-token state.
declare global {
  var __spark26Redis: RedisLike | undefined;
  var __spark26Upstash: UpstashRedis | undefined;
}

export function redis(): RedisLike {
  if (globalThis.__spark26Redis) return globalThis.__spark26Redis;
  let client: RedisLike;
  if (env.REDIS_URL) {
    const io: IORedisClient = new IORedis(env.REDIS_URL);
    client = {
      get: (k) => io.get(k),
      set: (k, v, mode, ttl) =>
        mode === "EX" && ttl ? io.set(k, v, "EX", ttl) : io.set(k, v),
      del: (k) => io.del(k),
      setnx: async (k, v, ttl) => {
        const ok = await io.set(k, v, "EX", ttl, "NX");
        return ok === "OK";
      },
      setIfAbsent: async (k, v) => {
        const ok = await io.set(k, v, "NX");
        return ok === "OK";
      },
      zadd: (k, s, m) => io.zadd(k, s, m).then(Number),
      zrem: (k, m) => io.zrem(k, m).then(Number),
      zrangebyscore: (k, min, max) => io.zrangebyscore(k, min, max),
      scan: (cursor, match, count) =>
        io.scan(cursor, "MATCH", match, "COUNT", count) as Promise<[string, string[]]>,
      mget: (...keys) => io.mget(...keys),
    };
  } else {
    // automaticDeserialization=false keeps the Upstash branch behaviorally
    // identical to ioredis: .get() returns the raw string we wrote. With it
    // on (the default), Upstash parses JSON-shaped values into objects,
    // which breaks order-store's `JSON.parse(raw)` path.
    const up =
      globalThis.__spark26Upstash ??
      new UpstashRedis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
        automaticDeserialization: false,
      });
    globalThis.__spark26Upstash = up;
    client = {
      get: async (k) => (await up.get<string>(k)) ?? null,
      set: async (k, v, mode, ttl) => {
        if (mode === "EX" && ttl) await up.set(k, v, { ex: ttl });
        else await up.set(k, v);
        return "OK";
      },
      del: async (k) => (await up.del(k)) ?? 0,
      setnx: async (k, v, ttl) => {
        const ok = await up.set(k, v, { ex: ttl, nx: true });
        return ok === "OK";
      },
      setIfAbsent: async (k, v) => {
        const ok = await up.set(k, v, { nx: true });
        return ok === "OK";
      },
      zadd: async (k, s, m) => (await up.zadd(k, { score: s, member: m })) ?? 0,
      zrem: async (k, m) => (await up.zrem(k, m)) ?? 0,
      zrangebyscore: async (k, min, max) =>
        (await up.zrange(k, min, max, { byScore: true })) as string[],
      scan: async (cursor, match, count) =>
        up.scan(cursor, { match, count }),
      mget: async (...keys) =>
        ((await up.mget<string[]>(...keys)) as (string | null)[]),
    };
  }
  globalThis.__spark26Redis = client;
  return client;
}
