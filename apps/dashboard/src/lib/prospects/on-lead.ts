/**
 * What happens when a viewer first identifies themselves: resolve their email
 * domain to a company ONCE, then use that single answer twice - to enrich the
 * session and to ensure a Prospect exists for the domain.
 *
 * Kept together for exactly that reason. Wiring the two independently would
 * bill a model call per lead per consumer.
 *
 * Runs post-response via the ingest route's `after()`, and is fail-silent: a
 * lead that cannot be enriched or attributed must never affect the tracker
 * response the viewer already received.
 */

import { isBusinessDomain } from "@/lib/enrichment/consumer-domains";
import type { EnrichmentProvider, EnrichmentResult } from "@/lib/enrichment/types";
import type { VisitorSessionService } from "@/lib/services/types";
import { ensureProspectForDomain, type AutoProspectServices } from "./auto-create";

export interface LeadLogger {
  info(line: string): void;
  error(line: string, err?: unknown): void;
}

export interface HandleIdentifiedLeadDeps {
  provider: EnrichmentProvider;
  visitorSessions: Pick<VisitorSessionService, "setEnrichment">;
  prospects: AutoProspectServices;
  logger?: LeadLogger;
}

/**
 * Enrich the session and ensure the domain has a prospect. Only the domain
 * ever reaches the model or the logs - never the address it came from.
 */
export async function handleIdentifiedLead(
  params: { sessionId: string; domain: string },
  deps: HandleIdentifiedLeadDeps,
): Promise<void> {
  const { sessionId, domain } = params;
  if (!isBusinessDomain(domain)) return;

  let enriched: EnrichmentResult | null = null;
  try {
    enriched = await deps.provider.enrich({ domain });
  } catch (err) {
    deps.logger?.error(
      `[lead] session=${sessionId} outcome=enrich-error`,
      err instanceof Error ? err.name : typeof err,
    );
  }

  if (enriched) {
    try {
      // Ingest path keeps the write-once guard: retried batches must not
      // overwrite a result that already landed.
      await deps.visitorSessions.setEnrichment(sessionId, enriched);
    } catch (err) {
      deps.logger?.error(
        `[lead] session=${sessionId} outcome=persist-error`,
        err instanceof Error ? err.name : typeof err,
      );
    }
  }

  try {
    const outcome = await ensureProspectForDomain(domain, {
      prospects: deps.prospects,
      // Reuse the single lookup above rather than enriching again.
      companyName: enriched?.company?.name,
      logger: deps.logger,
    });
    deps.logger?.info(
      `[lead] session=${sessionId} enriched=${enriched ? "yes" : "no"} prospect=${outcome.status}`,
    );
  } catch (err) {
    deps.logger?.error(
      `[lead] session=${sessionId} outcome=prospect-error`,
      err instanceof Error ? err.name : typeof err,
    );
  }
}
