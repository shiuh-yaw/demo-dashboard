"use server";

/**
 * Create the prospect for a contact's company from the contact detail page.
 *
 * The auto-create path only fires at enrichment time, so a contact enriched
 * before that shipped - or one whose prospect was deleted - had no route back:
 * the Enrich button is hidden once a company is resolved, and nothing else on
 * the page creates a prospect.
 */

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import {
  getSessionUser,
  resolveActiveScope,
  resolveAnalyticsReadScope,
} from "@/lib/auth/gtm";
import { canCreateRecord } from "@/lib/auth/policy";
import { domainOf } from "@/lib/enrichment/backfill";
import { ensureProspectForDomain } from "@/lib/prospects/auto-create";
import { services } from "@/lib/services";

export type CreateProspectForContactOutcome =
  | { status: "ok"; prospectId: string }
  /** A prospect already covered this domain - the caller just refreshes. */
  | { status: "exists"; prospectId: string }
  | { status: "ineligible" }
  | { status: "denied" }
  | { status: "error" };

export async function createProspectForContactAction(
  contactKey: string,
): Promise<CreateProspectForContactOutcome> {
  const user = await getSessionUser();
  if (!user) return { status: "denied" };
  if (!canCreateRecord(user)) return { status: "denied" };

  // Scope gate: the contact must be one this operator can already see, so a
  // hand-supplied key can't mint prospects off contacts they cannot read.
  const scope = await resolveActiveScope(user);
  const readScope = await resolveAnalyticsReadScope(user, scope);
  const detail = await services.analytics.getContactDetail(
    contactKey,
    readScope,
  );
  if (!detail) return { status: "denied" };

  const domain = domainOf(contactKey);
  if (!domain) return { status: "ineligible" };

  try {
    const outcome = await ensureProspectForDomain(domain, {
      prospects: services.prospects,
      // The resolved company name, so the row reads "Ramp" not "Ramp.com".
      companyName: detail.contact.company?.name ?? undefined,
      schedule: after,
      logger: {
        info: (line) => console.info(line),
        error: (line, err) => console.error(line, err),
      },
    });
    if (outcome.status === "skipped") return { status: "ineligible" };

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/contacts");
    revalidatePath(`/dashboard/contacts/${encodeURIComponent(contactKey)}`);
    return {
      status: outcome.status === "matched" ? "exists" : "ok",
      prospectId: outcome.prospect.id,
    };
  } catch (err) {
    console.error("[contact] prospect-create failed", err);
    return { status: "error" };
  }
}
