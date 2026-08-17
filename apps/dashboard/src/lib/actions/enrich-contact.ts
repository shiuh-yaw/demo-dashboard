"use server";

/**
 * On-demand enrichment actions (Phase GTM-10). Two entry points over the same
 * domain-deduped engine (`lib/enrichment/backfill.ts`):
 *
 * - `enrichContactAction` - one contact, from either Contacts surface. Reads
 *   the contact's sessions through the scope-enforced analytics read, so an
 *   operator can only ever enrich contacts already visible to them; a
 *   client-supplied `contactKey` outside that scope resolves to zero sessions.
 * - `backfillEnrichmentAction` - admin-only bulk sweep, bounded per run.
 *
 * Both write with `overwrite`, so a re-run replaces the stored value rather
 * than being silently refused. The null-only write-once guard stays on the
 * ingest path, where retries must be idempotent.
 */

import { revalidatePath } from "next/cache";
import {
  getSessionUser,
  requireAdmin,
  resolveActiveScope,
  resolveAnalyticsReadScope,
} from "@/lib/auth/gtm";
import { services, type ContactCompany } from "@/lib/services";
import { ensureProspectForDomain } from "@/lib/prospects/auto-create";
import { env } from "@/env";
import { getEnrichmentProvider } from "@/lib/enrichment";
import {
  domainOf,
  enrichSessions,
  type EnrichRunResult,
} from "@/lib/enrichment/backfill";

/** Sessions per bulk-backfill run. Bounded so one click can't sweep an
 * unbounded history; the result reports what was processed so the operator
 * knows whether to run it again. */
const BACKFILL_SESSION_LIMIT = 200;

/** Both entry points log their run: without this the on-demand path is silent,
 * which makes a miss indistinguishable from a failure in the server logs. */
const ENRICH_LOGGER = {
  info: (line: string) => console.info(line),
  error: (line: string, err?: unknown) =>
    err !== undefined ? console.error(line, err) : console.error(line),
};

export type EnrichContactOutcome =
  /** Resolved. `persisted` false means the company was identified but no row
   * was written (the session went away mid-run) - it will not survive a
   * reload, and the caller MUST say so rather than showing a plain success. */
  | { status: "ok"; company: ContactCompany; persisted: boolean }
  /** The provider ran and declined to name the company confidently. */
  | { status: "miss" }
  /** The provider call itself failed - distinct from a miss, and retryable. */
  | { status: "error" }
  | { status: "ineligible" }
  | { status: "unavailable" };

/**
 * Enriches one contact and returns the company the engine resolved, so the
 * caller renders it without a second read.
 *
 * Scoped to the contact's OWN email domain. One `anonId` can authenticate as
 * two different people, and those sessions merge into a single contact group -
 * so enriching every email found in the group would resolve several companies
 * and leave the caller picking one arbitrarily. An earlier cut did exactly
 * that and labelled a dynamic.xyz contact "Fireblocks".
 */
export async function enrichContactAction(
  contactKey: string,
): Promise<EnrichContactOutcome> {
  const user = await getSessionUser();
  if (!user) return { status: "ineligible" };

  const provider = getEnrichmentProvider(env.ANTHROPIC_API_KEY);
  if (provider.name === "noop") return { status: "unavailable" };

  const scope = await resolveActiveScope(user);
  const readScope = await resolveAnalyticsReadScope(user, scope);
  const sessions = await services.analytics.listAllContactSessions(
    contactKey,
    readScope,
  );

  // The contact key IS the captured email when the viewer identified; an
  // anonymous contact (key = anonId) has no domain and cannot be enriched.
  const contactDomain = domainOf(contactKey);
  if (!contactDomain) return { status: "ineligible" };

  const pending = sessions
    .filter((s) => s.company === null)
    .map((s) => ({ id: s.id, email: s.identifiedEmail ?? s.email }))
    .filter((s) => domainOf(s.email) === contactDomain);
  if (pending.length === 0) return { status: "ineligible" };

  const run = await enrichSessions(pending, {
    provider,
    visitorSessionService: services.visitorSessions,
    logger: ENRICH_LOGGER,
    // Operator-initiated: the click is the instruction, and it must be able to
    // repair rows whose stored enrichment carries no company.
    overwrite: true,
  });
  if (run.eligible === 0) return { status: "ineligible" };

  const resolved = run.companies.get(contactDomain)?.company;
  if (!resolved) return run.errors > 0 ? { status: "error" } : { status: "miss" };

  // Same as the ingest path: a resolved company means we know which company
  // this person belongs to, so give them one. Reuses the name just resolved
  // rather than paying for a second lookup.
  try {
    await ensureProspectForDomain(contactDomain, {
      prospects: services.prospects,
      companyName: resolved.name,
      logger: ENRICH_LOGGER,
    });
  } catch (err) {
    // The enrichment itself succeeded and is already stored - failing to
    // create the prospect must not turn that into an error for the operator.
    ENRICH_LOGGER.error(
      "[enrich] prospect-create failed",
      err instanceof Error ? err.name : typeof err,
    );
  }

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard");
  return {
    status: "ok",
    // Same projection `readCompany` applies to stored rows, so a just-enriched
    // contact renders identically to one loaded from the database.
    company: {
      name: resolved.name,
      domain: resolved.domain ?? null,
      industry: resolved.industry ?? null,
      sizeBand: resolved.sizeBand ?? null,
      summary: resolved.summary ?? null,
    },
    persisted: run.enriched > 0,
  };
}

/** Admin-only bulk sweep over historical un-enriched sessions. */
export async function backfillEnrichmentAction(): Promise<
  { status: "ok"; run: EnrichRunResult } | { status: "unavailable" }
> {
  await requireAdmin();

  const provider = getEnrichmentProvider(env.ANTHROPIC_API_KEY);
  if (provider.name === "noop") return { status: "unavailable" };

  const pending = await services.visitorSessions.listUnenriched(
    BACKFILL_SESSION_LIMIT,
  );
  const run = await enrichSessions(pending, {
    provider,
    visitorSessionService: services.visitorSessions,
    logger: ENRICH_LOGGER,
    // Operator-initiated: the click is the instruction, and it must be able to
    // repair rows whose stored enrichment carries no company.
    overwrite: true,
  });

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/operations");
  return { status: "ok", run };
}
