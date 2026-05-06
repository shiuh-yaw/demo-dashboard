/**
 * Tests for the in-flight webhook dedup helper.
 *
 * Two layers of dedup exist:
 *   1. Postgres unique `(provider, providerEventId)` (handled by
 *      `WebhookEventService.create` throwing `DuplicateWebhookEventError`).
 *   2. Redis SETNX with TTL=7d (this helper) — short-circuits before any
 *      DB round-trip when a retry arrives within the window.
 *
 * The helper accepts a small client surface (`set` with NX + EX semantics)
 * so the test injects an in-memory fake without standing up Redis.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DuplicateWebhookEventError,
  dedupOrThrow,
  type WebhookDedupClient,
} from "../idempotency";

interface SetCall {
  key: string;
  value: string;
  options: { nx?: boolean; ex?: number };
}

function createFakeRedis(): {
  client: WebhookDedupClient;
  calls: SetCall[];
  store: Map<string, string>;
} {
  const store = new Map<string, string>();
  const calls: SetCall[] = [];
  const client: WebhookDedupClient = {
    async set(key, value, options) {
      calls.push({ key, value, options: options ?? {} });
      if (options?.nx && store.has(key)) {
        return null;
      }
      store.set(key, value);
      return "OK";
    },
  };
  return { client, calls, store };
}

describe("dedupOrThrow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets the dedup key with NX + 7-day TTL on first delivery", async () => {
    const { client, calls, store } = createFakeRedis();

    await dedupOrThrow(client, "blindpay", "evt_123");

    expect(calls).toHaveLength(1);
    expect(calls[0]!.key).toBe("webhook:blindpay:evt_123");
    expect(calls[0]!.options.nx).toBe(true);
    // 7 days in seconds.
    expect(calls[0]!.options.ex).toBe(7 * 24 * 60 * 60);
    expect(store.get("webhook:blindpay:evt_123")).toBe("1");
  });

  it("throws DuplicateWebhookEventError on second delivery within window", async () => {
    const { client } = createFakeRedis();

    await dedupOrThrow(client, "blindpay", "evt_123");

    await expect(
      dedupOrThrow(client, "blindpay", "evt_123"),
    ).rejects.toBeInstanceOf(DuplicateWebhookEventError);
  });

  it("DuplicateWebhookEventError carries the provider + event id for logging", async () => {
    const { client } = createFakeRedis();

    await dedupOrThrow(client, "iron", "evt_xyz");
    try {
      await dedupOrThrow(client, "iron", "evt_xyz");
      throw new Error("expected DuplicateWebhookEventError");
    } catch (err) {
      expect(err).toBeInstanceOf(DuplicateWebhookEventError);
      const dup = err as DuplicateWebhookEventError;
      expect(dup.provider).toBe("iron");
      expect(dup.providerEventId).toBe("evt_xyz");
      expect(dup.name).toBe("DuplicateWebhookEventError");
    }
  });

  it("namespaces keys per provider — same id under different providers does not collide", async () => {
    const { client } = createFakeRedis();

    await dedupOrThrow(client, "blindpay", "evt_shared");
    // Same providerEventId, different provider — must succeed.
    await expect(
      dedupOrThrow(client, "iron", "evt_shared"),
    ).resolves.toBeUndefined();
  });

  it("uses the configured TTL when overridden via options", async () => {
    const { client, calls } = createFakeRedis();

    await dedupOrThrow(client, "blindpay", "evt_42", { ttlSeconds: 60 });

    expect(calls[0]!.options.ex).toBe(60);
  });
});
