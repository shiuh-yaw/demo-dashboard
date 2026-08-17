/**
 * On-demand enrichment engine - the shared core behind the per-contact
 * "Enrich" action and the admin bulk backfill. Both feed it un-enriched
 * sessions that already carry a captured email; nothing here needs new
 * visitor traffic.
 *
 * Domain-deduped: one provider call per DISTINCT domain, applied to every
 * session sharing it. A contact with 41 sessions on one domain costs a single
 * Claude call, not 41.
 *
 * PII guardrail (same as `./index.ts`): the provider only ever sees a domain,
 * and no email or domain is ever logged - only counts.
 */

import { isBusinessDomain } from "./consumer-domains";
import type { EnrichmentProvider, EnrichmentResult } from "./types";
import type { EnrichmentLogger } from "./index";
import type { VisitorSessionService } from "@/lib/services/types";

/** A session eligible for (re)enrichment: its id plus whatever email was captured. */
export interface EnrichableSession {
  id: string;
  email: string | null;
}

export interface EnrichRunResult {
  /** Sessions handed to this run. */
  scanned: number;
  /** Of those, sessions carrying a business-email domain. */
  eligible: number;
  /** Distinct domains resolved - equals the number of provider calls made. */
  domains: number;
  /** Sessions whose enrichment was actually PERSISTED (write-once guard let
   * the write through). A session already holding a result does not count. */
  enriched: number;
  /** Distinct domains the provider identified but declined to name confidently. */
  missed: number;
  /** Distinct domains whose provider call threw - an outage or bad request,
   * NOT the same as the provider saying "I don't know". */
  errors: number;
  /** Resolved results by domain, so callers can render what was found without
   * re-reading the rows they just wrote. */
  companies: Map<string, EnrichmentResult>;
}

function emptyResult(): EnrichRunResult {
  return {
    scanned: 0,
    eligible: 0,
    domains: 0,
    enriched: 0,
    missed: 0,
    errors: 0,
    companies: new Map(),
  };
}

/** Lowercased domain part of an email, or null when absent/malformed. */
export function domainOf(email: string | null | undefined): string | null {
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return domain ? domain : null;
}

/** Groups eligible sessions by their business-email domain. */
function groupByDomain(
  sessions: readonly EnrichableSession[],
): Map<string, string[]> {
  const byDomain = new Map<string, string[]>();
  for (const s of sessions) {
    const domain = domainOf(s.email);
    if (!domain || !isBusinessDomain(domain)) continue;
    const ids = byDomain.get(domain);
    if (ids) ids.push(s.id);
    else byDomain.set(domain, [s.id]);
  }
  return byDomain;
}

export interface EnrichSessionsOptions {
  provider: EnrichmentProvider;
  visitorSessionService: Pick<VisitorSessionService, "setEnrichment">;
  logger?: EnrichmentLogger;
  /** Replace existing enrichment rather than only filling nulls. Set by the
   * operator-initiated paths, where the click is the instruction and rows
   * holding legacy company-less enrichment must be repairable. */
  overwrite?: boolean;
}

/**
 * Enriches the given sessions, one provider call per distinct domain.
 * `setEnrichment` is write-once, so passing an already-enriched session is a
 * harmless no-op - callers filter anyway to avoid paying for the call.
 * A domain that throws is counted as a miss and never fails the whole run.
 */
export async function enrichSessions(
  sessions: readonly EnrichableSession[],
  opts: EnrichSessionsOptions,
): Promise<EnrichRunResult> {
  const { provider, visitorSessionService, logger, overwrite } = opts;
  if (sessions.length === 0) return emptyResult();

  const byDomain = groupByDomain(sessions);
  const run = emptyResult();
  run.scanned = sessions.length;
  run.domains = byDomain.size;
  run.eligible = Array.from(byDomain.values()).reduce(
    (n, ids) => n + ids.length,
    0,
  );

  for (const [domain, ids] of byDomain) {
    let result: EnrichmentResult | null;
    try {
      result = await provider.enrich({ domain });
    } catch (err) {
      // A thrown call is an outage/bad request, not "unknown company" - count
      // and log it separately so it can never masquerade as a clean miss.
      // Only the error's name is logged: a provider that puts the domain in
      // its message must not leak it here.
      run.errors += 1;
      logger?.error(
        `[enrich:run] provider=${provider.name} outcome=error sessions=${ids.length}`,
        err instanceof Error ? err.name : typeof err,
      );
      continue;
    }
    if (!result) {
      run.missed += 1;
      continue;
    }
    run.companies.set(domain, result);
    for (const id of ids) {
      const wrote = await visitorSessionService.setEnrichment(id, result, {
        overwrite,
      });
      if (wrote) run.enriched += 1;
    }
  }

  logger?.info(
    `[enrich:run] provider=${provider.name} scanned=${run.scanned} eligible=${run.eligible} domains=${run.domains} enriched=${run.enriched} missed=${run.missed} errors=${run.errors}`,
  );
  return run;
}
