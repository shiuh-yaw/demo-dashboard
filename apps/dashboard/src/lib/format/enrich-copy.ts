/**
 * Copy for every non-success enrich outcome, shared by the Contacts list and
 * the contact detail page so the same result never reads two ways.
 *
 * "miss" and "error" stay distinct: one means the model declined to name a
 * company, the other that the call failed and is worth retrying.
 */

import type { EnrichContactOutcome } from "@/lib/actions/enrich-contact";

export const ENRICH_MESSAGES: Record<
  Exclude<EnrichContactOutcome["status"], "ok">,
  string
> = {
  miss: "No confident match",
  error: "Lookup failed - retry",
  ineligible: "No work email",
  unavailable: "Enrichment not configured",
};

/** Shown beside a resolved company that could not be stored. */
export const ENRICH_NOT_SAVED = "Not saved";
