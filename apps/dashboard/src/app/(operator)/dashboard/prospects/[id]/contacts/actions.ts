"use server";

/**
 * Server action backing the contacts inline session expansion. Re-resolves
 * the caller's Tier-1 scope server-side rather than trusting anything from
 * the client - the read layer also re-checks scope itself (defense-in-depth).
 */

import { getSessionUser, visibleProspectIds } from "@/lib/auth/gtm";
import { services, type VisitorSessionView } from "@/lib/services";

export async function listContactSessionsAction(
  prospectId: string,
  contactKey: string,
): Promise<VisitorSessionView[]> {
  const user = await getSessionUser();
  const scope = user ? await visibleProspectIds(user) : new Set<string>();
  return services.analytics.listContactSessions(prospectId, contactKey, scope);
}
