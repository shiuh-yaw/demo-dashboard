/**
 * Fixed-window rate limiter for `/api/events`. The webhook framework's
 * `WebhookDedupClient` (`src/lib/webhooks/idempotency.ts`) only exposes
 * `set` (NX/EX) - not enough for a counter - so this builds a small
 * `incr`+`expire` primitive on the same Upstash/ioredis rails instead of
 * adding a new rate-limit dependency.
 */

export interface TrackRateLimitClient {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number | boolean>;
}

export interface TrackRateLimiter {
  limit(identifier: string): Promise<{ success: boolean }>;
}

export interface FixedWindowRateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window size in seconds. */
  windowSeconds: number;
}

/** ~120 req/min per identifier, matching the phase spec default. */
export const DEFAULT_TRACK_RATE_LIMIT: FixedWindowRateLimitOptions = {
  limit: 120,
  windowSeconds: 60,
};

/**
 * Coarse ceiling keyed on ipHash alone (see handler.ts C1) - one order of
 * magnitude above the per-session cap. Client-minted ids (anonId,
 * sessionId, shareToken) can be rotated per request, so a limiter keyed on
 * them alone never trips; this one cannot be evaded that way since it never
 * reads a client-controlled field.
 */
export const DEFAULT_TRACK_IP_RATE_LIMIT: FixedWindowRateLimitOptions = {
  limit: 1200,
  windowSeconds: 60,
};

export function createFixedWindowRateLimiter(
  client: TrackRateLimitClient,
  options: FixedWindowRateLimitOptions,
): TrackRateLimiter {
  return {
    async limit(identifier: string) {
      const window = Math.floor(Date.now() / (options.windowSeconds * 1000));
      const key = `track:ratelimit:${identifier}:${window}`;
      const count = await client.incr(key);
      if (count === 1) {
        // First hit in this window - set the TTL so the key self-expires
        // instead of accumulating forever.
        await client.expire(key, options.windowSeconds);
      }
      return { success: count <= options.limit };
    },
  };
}

/**
 * Defers `clientFactory()` until the first `.limit()` call instead of at
 * construction time - route.ts builds limiters at module scope, so an
 * eager client (ioredis `new IORedis(...)` connects immediately) would
 * open a connection on import, including in tests that never call
 * `.limit()`. The factory itself may already return a cached singleton
 * (see redis-client.ts), so calling it more than once is safe.
 */
export function createLazyRateLimiter(
  clientFactory: () => TrackRateLimitClient,
  options: FixedWindowRateLimitOptions,
): TrackRateLimiter {
  let limiter: TrackRateLimiter | null = null;
  return {
    async limit(identifier: string) {
      if (!limiter) {
        limiter = createFixedWindowRateLimiter(clientFactory(), options);
      }
      return limiter.limit(identifier);
    },
  };
}
