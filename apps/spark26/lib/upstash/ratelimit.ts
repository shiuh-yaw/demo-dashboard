import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

// Minimal Ratelimit surface — just what our callers use.
export type LimiterLike = Pick<Ratelimit, "limit">;

// Noop used when Upstash REST creds aren't configured (typical in local dev,
// where ioredis handles the order store and rate limiting is overkill).
// Always succeeds. Production deploys MUST set UPSTASH_REDIS_REST_URL +
// _TOKEN so a real limiter protects the public status endpoint.
const ALWAYS_OK: LimiterLike = {
  limit: async () => ({
    success: true,
    limit: Number.POSITIVE_INFINITY,
    remaining: Number.POSITIVE_INFINITY,
    reset: Date.now() + 60_000,
    pending: Promise.resolve(),
  }),
};

let perConfirmation: LimiterLike | null = null;
let perIp: LimiterLike | null = null;

function isConfigured(): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

function redisUpstash() {
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export function confirmationLimiter(): LimiterLike {
  if (!perConfirmation) {
    perConfirmation = isConfigured()
      ? new Ratelimit({
          redis: redisUpstash(),
          limiter: Ratelimit.slidingWindow(10, "10 s"),
          prefix: "spark26:rl:confirmation",
        })
      : ALWAYS_OK;
  }
  return perConfirmation;
}

export function ipLimiter(): LimiterLike {
  if (!perIp) {
    perIp = isConfigured()
      ? new Ratelimit({
          redis: redisUpstash(),
          limiter: Ratelimit.slidingWindow(60, "60 s"),
          prefix: "spark26:rl:ip",
        })
      : ALWAYS_OK;
  }
  return perIp;
}
