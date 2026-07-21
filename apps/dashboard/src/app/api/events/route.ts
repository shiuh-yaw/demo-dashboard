/**
 * Public GTM tracker ingest endpoint - Phase GTM-06.
 *
 * Public by design: viewers on live demos are anonymous. Wires the
 * pipeline in `src/lib/track/handler.ts` to real services + env; see
 * that file for the CORS/validate/rate-limit/attribute/persist pipeline.
 */

import { env } from "@/env";
import { shareLinkService, visitorSessionService } from "@/lib/services";
import { parseTrackCorsOrigins } from "@/lib/track-cors";
import { createTrackHandler } from "@/lib/track/handler";
import {
  createLazyRateLimiter,
  DEFAULT_TRACK_IP_RATE_LIMIT,
  DEFAULT_TRACK_RATE_LIMIT,
} from "@/lib/track/rate-limit";
import { getTrackRateLimitClient } from "@/lib/track/redis-client";

// `createLazyRateLimiter` defers `getTrackRateLimitClient()` (M2) until the
// first real request instead of at module import - avoids opening an
// ioredis connection on import in environments (including tests) that
// never call the handler.
const handlers = createTrackHandler({
  allowedOrigins: parseTrackCorsOrigins(env.TRACK_CORS_ORIGINS),
  ipHashSalt: env.IP_HASH_SALT,
  shareLinkService,
  visitorSessionService,
  rateLimiter: createLazyRateLimiter(
    getTrackRateLimitClient,
    DEFAULT_TRACK_RATE_LIMIT,
  ),
  ipRateLimiter: createLazyRateLimiter(
    getTrackRateLimitClient,
    DEFAULT_TRACK_IP_RATE_LIMIT,
  ),
});

export const POST = handlers.POST;
export const OPTIONS = handlers.OPTIONS;
