/**
 * In-flight webhook dedup helper (D-011).
 *
 * Two layers of dedup protect the receiver:
 *   1. Postgres unique `(provider, providerEventId)` — the durable
 *      authoritative dedup, enforced by `WebhookEventService.create`.
 *   2. Redis SETNX with TTL=7 days (this helper) — short-circuits before
 *      any DB round-trip when the same provider redelivers within the
 *      window, which is the common case for retry storms.
 *
 * The helper accepts a small client surface (NX + EX semantics) rather
 * than a full Redis client so unit tests inject in-memory fakes without
 * spinning up Redis. Real callers pass an Upstash or ioredis client
 * adapter that satisfies `WebhookDedupClient`.
 *
 * On a hit, throws `DuplicateWebhookEventError` carrying the provider
 * and event id; the receiver translates that into a 200 OK ack so the
 * provider doesn't keep retrying.
 */

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface WebhookDedupClient {
  /**
   * Set `key` to `value`. With `nx: true`, returns null if the key
   * already exists (no write performed). With `ex`, sets a TTL in
   * seconds. The unified `RedisClient` in `lib/redis.ts` does not
   * expose the NX flag today; the receiver factory wraps the chosen
   * Redis adapter into this interface.
   */
  set(
    key: string,
    value: string,
    options?: { nx?: boolean; ex?: number },
  ): Promise<string | null>;
}

export class DuplicateWebhookEventError extends Error {
  constructor(
    public readonly provider: string,
    public readonly providerEventId: string,
  ) {
    super(
      `Duplicate webhook event: provider=${provider} providerEventId=${providerEventId}`,
    );
    this.name = "DuplicateWebhookEventError";
  }
}

export interface DedupOptions {
  /** Override the dedup window. Defaults to 7 days (provider-retry SLAs). */
  ttlSeconds?: number;
}

/**
 * Reserve a dedup slot for `(provider, providerEventId)` or throw
 * `DuplicateWebhookEventError` if it's already reserved.
 *
 * Idempotent: the receiver should call this once per delivery before
 * doing any side-effecting work.
 */
export async function dedupOrThrow(
  client: WebhookDedupClient,
  provider: string,
  providerEventId: string,
  options: DedupOptions = {},
): Promise<void> {
  const key = dedupKey(provider, providerEventId);
  const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const result = await client.set(key, "1", { nx: true, ex: ttl });
  if (result === null) {
    throw new DuplicateWebhookEventError(provider, providerEventId);
  }
}

export function dedupKey(provider: string, providerEventId: string): string {
  return `webhook:${provider}:${providerEventId}`;
}
