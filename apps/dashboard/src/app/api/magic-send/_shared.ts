/**
 * Magic-send API — shared wiring.
 *
 * Single place that constructs the `MagicSendIntentService` so the route
 * files don't repeat the singleton + dependency-injection boilerplate.
 *
 * `_shared.ts` is a Next.js-safe filename prefix (the underscore opts
 * the file out of automatic route discovery — Next.js ignores any
 * `_`-prefixed file under `app/api`).
 */

import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

import { env } from "@/env";
import {
  MagicSendIntentService,
  vaultAdapterFromEnv,
  type MagicSendRedisClient,
  type UserOpExecutor,
  type UserOpExecutorRequest,
  type UserOpExecutorResult,
} from "@/lib/services/magic-send";
import { transactionRecordService } from "@/lib/services";

let cached: MagicSendIntentService | null = null;
let cachedRedis: MagicSendRedisClient | null = null;
let cachedIoredis: IORedis | null = null;

function isUpstashConfigured(): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Build a `MagicSendRedisClient` adapter from the configured Redis.
 * Production uses Upstash REST; local dev uses ioredis. Both expose
 * `get/set/del` and SETNX semantics.
 */
function getMagicSendRedis(): MagicSendRedisClient {
  if (cachedRedis) return cachedRedis;

  if (isUpstashConfigured()) {
    const upstash = new UpstashRedis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
    cachedRedis = {
      async set(key, value, options) {
        // Upstash's `set` has a heavily-narrowed discriminated-union
        // SetCommandOptions type that fights with our `{ nx?, ex? }`
        // shape. Both `nx: true, ex: <n>` and the empty options object
        // are valid at runtime; the cast is the cheapest way to skip
        // the type-level branch enumeration without losing safety
        // (the function signature on our side stays strict).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (upstash.set as any)(key, value, options);
        return (result as "OK" | null) ?? null;
      },
      async get(key) {
        // Upstash auto-parses JSON; force string round-trip.
        const v = await upstash.get<string | object>(key);
        if (v === null || v === undefined) return null;
        return typeof v === "string" ? v : JSON.stringify(v);
      },
      async del(key) {
        return await upstash.del(key);
      },
    };
    return cachedRedis;
  }

  if (!cachedIoredis) {
    cachedIoredis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5000,
    });
    cachedIoredis.on("error", (err) => {
      console.error("[magic-send:redis] connection error", err.message);
    });
  }
  const client = cachedIoredis;
  cachedRedis = {
    async set(key, value, options) {
      if (!options || (options.nx === undefined && options.ex === undefined)) {
        return (await client.set(key, value)) as "OK" | null;
      }
      const args: (string | number)[] = [key, value];
      if (options.ex !== undefined) {
        args.push("EX", options.ex);
      }
      if (options.nx) {
        args.push("NX");
      }
      // ioredis types are heavily overloaded; spread + cast.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await (client.set as (...a: any[]) => Promise<"OK" | null>)(
        ...args,
      );
      return r ?? null;
    },
    async get(key) {
      return await client.get(key);
    },
    async del(key) {
      return await client.del(key);
    },
  };
  return cachedRedis;
}

/**
 * Build a no-op executor that records the dispatch intent without
 * actually invoking ZeroDev's `sendUserOperation`.
 *
 * The Dynamic ZeroDev SDK (`@dynamic-labs-sdk/zerodev`) requires a
 * browser-instantiated `EvmWalletAccount` or a `KernelClient` derived
 * from one — both are client-side constructs. Phase 7 ships the
 * dashboard's orchestration plumbing; the actual userop dispatch path
 * (client-side relay, session-key flow, or a server-callable surface
 * if Dynamic exposes one) lands in a follow-up PR.
 *
 * For now the executor synthesises a deterministic bundle hash from
 * the intent id so the rest of the state machine + client polling
 * still threads end-to-end. Routes that need real submission should
 * accept a client-prepared bundle hash via the execute route body.
 */
const PHASE_7_NOOP_EXECUTOR: UserOpExecutor = {
  async send(req: UserOpExecutorRequest): Promise<UserOpExecutorResult> {
    // 32-byte synthetic hash from the intent id. Deterministic so
    // tests don't need a mock-and-replay. Real implementations will
    // overwrite this with the bundler's returned hash.
    const idHex = Buffer.from(req.intent.id, "utf8")
      .toString("hex")
      .padEnd(64, "0")
      .slice(0, 64);
    return { bundleHash: (`0x${idHex}` as `0x${string}`) };
  },
};

/**
 * Lazily build (and cache) the magic-send service. The vault adapter
 * throws if its env vars are missing — that throw is intentional so
 * unrelated routes aren't penalised when magic-send is unconfigured.
 */
export function getMagicSendIntentService(opts?: {
  userOpExecutor?: UserOpExecutor;
}): MagicSendIntentService {
  if (cached && !opts?.userOpExecutor) return cached;

  const redis = getMagicSendRedis();

  const vault = vaultAdapterFromEnv({
    MAGIC_SEND_VAULT_PRIVATE_KEY: env.MAGIC_SEND_VAULT_PRIVATE_KEY,
    MAGIC_SEND_VAULT_CHAIN_ID: env.MAGIC_SEND_VAULT_CHAIN_ID,
    MAGIC_SEND_VAULT_RPC_URL: env.MAGIC_SEND_VAULT_RPC_URL,
  });

  const svc = new MagicSendIntentService({
    transactionRecords: transactionRecordService,
    redis,
    vault,
    userOpExecutor: opts?.userOpExecutor ?? PHASE_7_NOOP_EXECUTOR,
  });

  if (!opts?.userOpExecutor) cached = svc;
  return svc;
}

/**
 * Get the magic-send Redis client (sandbox / production aware). Exposed
 * so the webhook handler can do its own pending-lookup without going
 * through the full intent service.
 */
export function getMagicSendRedisClient(): MagicSendRedisClient {
  return getMagicSendRedis();
}

/**
 * Verify the internal API secret on a request. Returns true on match,
 * false otherwise. Used by /api/magic-send/intents/[id]/execute to
 * reject external callers.
 */
export function checkInternalApiSecret(req: Request): boolean {
  const expected = env.INTERNAL_API_SECRET;
  if (!expected) return false;
  const supplied = req.headers.get("x-internal-api-secret");
  if (!supplied) return false;
  // Constant-time compare so we don't leak length / prefix info via
  // timing.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(supplied, "utf8");
  if (a.length !== b.length) return false;
  try {
    // crypto is Node-only; this file is server-side only (App Router
    // route handlers run on the server).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { timingSafeEqual } = require("node:crypto") as typeof import("node:crypto");
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Reset the cached service. Test-only helper.
 */
export function __resetMagicSendServiceCacheForTests(): void {
  cached = null;
}
