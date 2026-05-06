/**
 * Lazy-init helper that picks the right dedup adapter (Upstash for prod,
 * ioredis for local dev) based on env. Centralised so every provider
 * route gets the same singleton.
 */

import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

import { env } from "@/env";

import {
  createIoredisDedupAdapter,
  createUpstashDedupAdapter,
} from "./redis-adapter";
import type { WebhookDedupClient } from "./idempotency";

let cached: WebhookDedupClient | null = null;
let cachedIoredis: IORedis | null = null;

function isUpstashConfigured(): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Return the singleton dedup client appropriate for the current
 * environment. Safe to call at request time; Vercel reuses warm
 * lambdas so the adapter is built at most once per container.
 */
export function getWebhookDedupClient(): WebhookDedupClient {
  if (cached) return cached;

  if (isUpstashConfigured()) {
    const upstash = new UpstashRedis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
    cached = createUpstashDedupAdapter(upstash);
    return cached;
  }

  if (!cachedIoredis) {
    cachedIoredis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5000,
    });
    cachedIoredis.on("error", (err) => {
      console.error("[webhook:redis] connection error", err.message);
    });
  }
  cached = createIoredisDedupAdapter(cachedIoredis);
  return cached;
}

/**
 * Test-only: reset the cached adapter so route handler tests can rebind
 * to a fresh in-memory client. Not exported from the public surface.
 */
export function __resetWebhookDedupClientForTests(): void {
  cached = null;
  cachedIoredis = null;
}
