/**
 * Adapt the dashboard's Redis clients (Upstash or local ioredis) to the
 * `WebhookDedupClient` surface used by `dedupOrThrow`.
 *
 * The unified `RedisClient` in `lib/redis.ts` does not expose NX today —
 * it's a generic value-store interface. The dedup primitive needs NX +
 * EX in one round-trip, so this adapter wraps whichever underlying
 * client is configured.
 *
 * Why a separate file? It lets the test suite unit-test the translation
 * without booting Redis, and the route file imports a single helper
 * (`getWebhookDedupClient()`) without conditional logic in line.
 */

import type { WebhookDedupClient } from "./idempotency";

/**
 * Loose structural shape we accept for an ioredis-like client. The real
 * `ioredis.Redis` has heavily overloaded `set` typing (positional EX/NX
 * flags vs. callbacks) that doesn't narrow to a single signature, so we
 * accept any callable matching `set` and cast inside the adapter.
 *
 * We use `any` deliberately: a stricter type forces every call site to
 * type-juggle the variadic args, and structural typing of the real
 * `Redis` class fails because of the callback overload.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IoredisDedupSurface = { set: (...args: any[]) => any };

/**
 * Loose structural shape we accept for an Upstash-like client. The real
 * `@upstash/redis`'s `set` signature has a generic `TData` we don't use
 * (we always store the string `"1"`); narrowing to a strict shape forces
 * casts at every call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UpstashDedupSurface = { set: (...args: any[]) => any };

/**
 * Build a dedup client from an ioredis instance. The ioredis `set` API
 * uses positional flags (`set(key, value, "EX", seconds, "NX")`).
 */
export function createIoredisDedupAdapter(
  client: IoredisDedupSurface,
): WebhookDedupClient {
  return {
    async set(key, value, options) {
      if (!options || (options.nx === undefined && options.ex === undefined)) {
        const result = await client.set(key, value);
        return (result as "OK" | null) ?? null;
      }
      const args: unknown[] = [key, value];
      if (options.ex !== undefined) {
        args.push("EX", options.ex);
      }
      if (options.nx) {
        args.push("NX");
      }
      const result = await client.set(...args);
      return (result as "OK" | null) ?? null;
    },
  };
}

/**
 * Build a dedup client from an Upstash Redis instance. Upstash's REST
 * client takes options in an object: `set(key, value, { nx, ex })`.
 */
export function createUpstashDedupAdapter(
  client: UpstashDedupSurface,
): WebhookDedupClient {
  return {
    async set(key, value, options) {
      const result = await client.set(key, value, options);
      return (result as "OK" | null) ?? null;
    },
  };
}
