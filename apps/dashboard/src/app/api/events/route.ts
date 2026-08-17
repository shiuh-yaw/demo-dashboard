/**
 * Public GTM tracker ingest endpoint - Phase GTM-06.
 *
 * Public by design: viewers on live demos are anonymous. Wires the
 * pipeline in `src/lib/track/handler.ts` to real services + env; see
 * that file for the CORS/validate/rate-limit/attribute/persist pipeline.
 *
 * `onEmailIdentified` fires post-response when a batch first carries an
 * identified email: one domain lookup feeds both the session's company
 * enrichment and the find-or-create of a Prospect for that domain, so a lead
 * always lands under a company instead of unattributed "Direct" traffic. The
 * provider is env-selected (`ANTHROPIC_API_KEY` unset -> noop) and built once
 * at module scope, since it does no I/O until actually invoked.
 */

import { after } from "next/server";

import { env } from "@/env";
import { getEnrichmentProvider } from "@/lib/enrichment";
import { handleIdentifiedLead } from "@/lib/prospects/on-lead";
import { handleLead } from "@/lib/analytics/leads/handle";
import { services, shareLinkService, visitorSessionService } from "@/lib/services";
import { parseTrackCorsOrigins } from "@/lib/track-cors";
import { createTrackHandler } from "@/lib/track/handler";
import {
  createLazyRateLimiter,
  DEFAULT_TRACK_IP_RATE_LIMIT,
  DEFAULT_TRACK_RATE_LIMIT,
} from "@/lib/track/rate-limit";
import { getTrackRateLimitClient } from "@/lib/track/redis-client";

const enrichmentProvider = getEnrichmentProvider(env.ANTHROPIC_API_KEY);

const leadLogger = {
  info: (line: string) => console.info(line),
  error: (line: string, err?: unknown) =>
    err !== undefined ? console.error(line, err) : console.error(line),
};

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
  onEmailIdentified: ({ sessionId, domain }) =>
    handleIdentifiedLead(
      { sessionId, domain },
      {
        provider: enrichmentProvider,
        visitorSessions: visitorSessionService,
        prospects: services.prospects,
        logger: leadLogger,
      },
    ),
  onBatchIngested: ({ batch, prospectId, isInternal }) => {
    after(() => handleLead(batch, { prospectId, isInternal }));
  },
});

export const POST = handlers.POST;
export const OPTIONS = handlers.OPTIONS;
