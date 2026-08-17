/**
 * Enrichment entry point - Phase GTM-10. Wires the env-selected provider
 * (Claude when ANTHROPIC_API_KEY is set, else noop) to
 * `services.visitorSessions.setEnrichment`. Called from the ingest route's
 * `after()` hook (`src/lib/track/handler.ts`) when a batch first carries an
 * identified email - never in the response hot path.
 *
 * Guardrails: consumer email domains (gmail/outlook/...) are skipped here;
 * the provider only ever sees the domain, never the full email; and `setEnrichment`
 * is write-once, so a repeat identify never overwrites a prior result.
 *
 * PII guardrail: only the outcome/timing line below is ever logged. The
 * domain itself is never written to a log.
 */

import { noopEnrichmentProvider } from "./noop";
import { createClaudeProvider } from "./claude";
import { isBusinessDomain } from "./consumer-domains";
import type { EnrichmentProvider } from "./types";
import type { VisitorSessionService } from "@/lib/services/types";

export type { EnrichmentProvider, EnrichmentResult } from "./types";
export { isBusinessDomain } from "./consumer-domains";
export { createClaudeProvider } from "./claude";

export interface EnrichmentLogger {
  info(line: string): void;
  error(line: string, err?: unknown): void;
}

const DEFAULT_LOGGER: EnrichmentLogger = {
  info: (line) => console.info(line),
  error: (line, err) => {
    if (err !== undefined) console.error(line, err);
    else console.error(line);
  },
};

/** `ANTHROPIC_API_KEY` unset -> noop; the system is fully functional either way. */
export function getEnrichmentProvider(
  anthropicApiKey: string | undefined,
): EnrichmentProvider {
  return anthropicApiKey
    ? createClaudeProvider({ apiKey: anthropicApiKey })
    : noopEnrichmentProvider;
}

export interface CreateEnrichSessionOptions {
  provider: EnrichmentProvider;
  visitorSessionService: Pick<VisitorSessionService, "setEnrichment">;
  logger?: EnrichmentLogger;
}

export type EnrichSessionFn = (
  sessionId: string,
  input: { domain: string },
) => Promise<void>;

/**
 * Factory so tests can inject a fake provider/service/logger without touching
 * env or the real Postgres-backed service (mirrors `createTrackHandler`'s DI).
 */
export function createEnrichSession(
  opts: CreateEnrichSessionOptions,
): EnrichSessionFn {
  const { provider, visitorSessionService, logger = DEFAULT_LOGGER } = opts;

  return async function enrichSession(sessionId, { domain }) {
    if (!isBusinessDomain(domain)) return;

    const startedAt = Date.now();
    try {
      const result = await provider.enrich({ domain });
      if (result) {
        await visitorSessionService.setEnrichment(sessionId, result);
      }
      logger.info(
        `[enrich] session=${sessionId} provider=${provider.name} outcome=${result ? "ok" : "miss"} durMs=${Date.now() - startedAt}`,
      );
    } catch (err) {
      // Enrichment failure never affects the already-sent response - this runs
      // post-response via `after()`. Log only the error's name so a provider
      // that throws with the domain in its message can't leak it here.
      const errName = err instanceof Error ? err.name : typeof err;
      logger.error(
        `[enrich] session=${sessionId} provider=${provider.name} outcome=error durMs=${Date.now() - startedAt}`,
        errName,
      );
    }
  };
}
