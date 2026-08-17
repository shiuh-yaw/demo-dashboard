"use server";

/**
 * Admin sweep that gives every existing lead a company. The ingest path only
 * creates a prospect for leads arriving from now on, so this is what
 * retrofits the contacts already captured.
 *
 * Domain-deduped: every contact on the same domain resolves to one prospect,
 * so 40 gmail-free leads at one company cost one lookup and create one row.
 */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/gtm";
import { env } from "@/env";
import { getEnrichmentProvider } from "@/lib/enrichment";
import { domainOf } from "@/lib/enrichment/backfill";
import { isBusinessDomain } from "@/lib/enrichment/consumer-domains";
import { ensureProspectForDomain } from "@/lib/prospects/auto-create";
import { services } from "@/lib/services";

/** Contacts examined per run. Bounded so one click cannot sweep unbounded
 * history; the summary reports what was processed. */
const CONTACT_SCAN_LIMIT = 500;

export interface ProspectBackfillResult {
  /** Contacts examined. */
  scanned: number;
  /** Of those, contacts on a business domain. */
  business: number;
  /** Distinct business domains - the number of find-or-create attempts. */
  domains: number;
  /** Domains that already had a prospect. */
  matched: number;
  /** Prospects created. */
  created: number;
  /** Contacts skipped for a consumer or malformed domain. */
  skipped: number;
}

export async function backfillProspectsAction(): Promise<ProspectBackfillResult> {
  await requireAdmin();

  const emails = await services.contacts.listEmails(CONTACT_SCAN_LIMIT);

  const domains = new Set<string>();
  let business = 0;
  for (const email of emails) {
    const domain = domainOf(email);
    if (!domain || !isBusinessDomain(domain)) continue;
    business += 1;
    domains.add(domain);
  }

  // Names come from enrichment so rows read "Fireblocks", not "fireblocks.com".
  const provider = getEnrichmentProvider(env.ANTHROPIC_API_KEY);
  const logger = {
    info: (line: string) => console.info(line),
    error: (line: string, err?: unknown) =>
      err !== undefined ? console.error(line, err) : console.error(line),
  };

  let matched = 0;
  let created = 0;
  for (const domain of domains) {
    try {
      const outcome = await ensureProspectForDomain(domain, {
        prospects: services.prospects,
        provider,
        logger,
      });
      if (outcome.status === "created") created += 1;
      else if (outcome.status === "matched") matched += 1;
    } catch (err) {
      // One bad domain must not abort the sweep.
      logger.error(
        `[prospect-backfill] failed for one domain`,
        err instanceof Error ? err.name : typeof err,
      );
    }
  }

  const result: ProspectBackfillResult = {
    scanned: emails.length,
    business,
    domains: domains.size,
    matched,
    created,
    skipped: emails.length - business,
  };
  logger.info(
    `[prospect-backfill] scanned=${result.scanned} business=${result.business} domains=${result.domains} matched=${result.matched} created=${result.created}`,
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/operations");
  return result;
}
