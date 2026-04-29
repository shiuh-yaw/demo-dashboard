import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Production requires reasonably strong secrets — 12 chars + the per-IP
// rate limiter is enough to resist brute-force and online dictionary
// attacks against the admin endpoint; CRON_SECRET is never typed, so a
// passphrase-length floor suits both. Development relaxes to 6 chars so
// "banana"-grade placeholders work while smoke-testing.
const SECRET_MIN_LENGTH = process.env.NODE_ENV === "production" ? 12 : 6;

// Env policy:
// - Required at boot: anything that's needed to render any page or complete the
//   happy user-facing flow — Dynamic, Cvent, the destination wallet, a Redis
//   backend (Upstash prod OR local ioredis).
// - Optional at boot: QSTASH/*, CRON_SECRET, SPARK26_ADMIN_SECRET. These gate
//   the Cvent-post retry worker, the reconcile cron, and the admin debug
//   route. They fail loudly at call-time if missing; local Tier 1/2 dev
//   doesn't need them.
// - Redis: one of UPSTASH_REDIS_REST_URL+TOKEN (prod) or REDIS_URL (local
//   ioredis) must be set — lib/store/redis-client.ts enforces this.
export const env = createEnv({
  server: {
    DYNAMIC_API_KEY: z.string().min(1),
    CVENT_CLIENT_ID: z.string().min(1),
    CVENT_CLIENT_SECRET: z.string().min(1),
    CVENT_EVENT_ID: z.string().min(1),
    // Bare host only — the /ea REST prefix is appended in lib/cvent/client.ts.
    // EU tenants: https://api-platform-eur.cvent.com
    CVENT_BASE_URL: z.string().url().default("https://api-platform.cvent.com"),
    SPARK26_DESTINATION_ADDRESS: z
      .string()
      .regex(
        /^0x[0-9a-fA-F]{40}$/,
        "Must be a 0x-prefixed 40-char EVM address",
      ),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    REDIS_URL: z.string().optional(),
    QSTASH_TOKEN: z.string().min(1).optional(),
    QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
    QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),
    CRON_SECRET: z.string().min(SECRET_MIN_LENGTH).optional(),
    SPARK26_ADMIN_SECRET: z.string().min(SECRET_MIN_LENGTH).optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  client: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1),
  },
  runtimeEnv: {
    DYNAMIC_API_KEY: process.env.DYNAMIC_API_KEY,
    CVENT_CLIENT_ID: process.env.CVENT_CLIENT_ID,
    CVENT_CLIENT_SECRET: process.env.CVENT_CLIENT_SECRET,
    CVENT_EVENT_ID: process.env.CVENT_EVENT_ID,
    CVENT_BASE_URL: process.env.CVENT_BASE_URL,
    SPARK26_DESTINATION_ADDRESS: process.env.SPARK26_DESTINATION_ADDRESS,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    REDIS_URL: process.env.REDIS_URL,
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    SPARK26_ADMIN_SECRET: process.env.SPARK26_ADMIN_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
