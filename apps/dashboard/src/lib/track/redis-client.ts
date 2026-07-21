/**
 * Lazy-init singleton for the track rate limiter's Redis client - mirrors
 * `src/lib/webhooks/redis-client.ts`'s Upstash-for-prod / ioredis-for-local
 * selection, kept separate because the shapes differ (`incr`/`expire`
 * here vs `set` NX/EX there).
 */

import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

import { env } from "@/env";

import type { TrackRateLimitClient } from "./rate-limit";

let cached: TrackRateLimitClient | null = null;
let cachedIoredis: IORedis | null = null;

function isUpstashConfigured(): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

/** Both Upstash's and ioredis's clients satisfy `incr`/`expire` natively. */
export function getTrackRateLimitClient(): TrackRateLimitClient {
  if (cached) return cached;

  if (isUpstashConfigured()) {
    cached = new UpstashRedis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
    return cached;
  }

  if (!cachedIoredis) {
    cachedIoredis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5000,
    });
    cachedIoredis.on("error", (err) => {
      console.error("[track:redis] connection error", err.message);
    });
  }
  cached = cachedIoredis;
  return cached;
}

/** Test-only: reset the cached client so tests rebind to a fresh fake. */
export function __resetTrackRateLimitClientForTests(): void {
  cached = null;
  cachedIoredis = null;
}
