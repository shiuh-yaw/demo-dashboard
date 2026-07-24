"use server";

/**
 * Server actions backing the org-wide Contacts workspace view: the
 * "Load more" page fetches (`useInfiniteList`'s `fetchPage`) and the inline
 * session expansion. Both re-resolve the caller's ACTIVE My/Team/All scope
 * server-side on every call - never trusting anything the client sent - the
 * same defense-in-depth the per-prospect `listContactSessionsAction` follows.
 */

import {
  getSessionUser,
  resolveActiveScope,
  resolveAnalyticsReadScope,
} from "@/lib/auth/gtm";
import { services, type Page, type VisitorSessionView } from "@/lib/services";
import { toContactRows, type ContactRow } from "./contact-row";

/** One page of the org-wide contacts list, scoped to the caller's active scope. */
export async function listAllContactsAction(
  cursor: string | null,
): Promise<Page<ContactRow>> {
  const user = await getSessionUser();
  if (!user) return { items: [], nextCursor: null };

  const scope = await resolveActiveScope(user);
  const readScope = await resolveAnalyticsReadScope(user, scope);
  const page = await services.analytics.listAllContacts(readScope, { cursor });
  return toContactRows(page);
}

/** Sessions for one contact across every prospect in the caller's active scope. */
export async function listAllContactSessionsAction(
  contactKey: string,
): Promise<VisitorSessionView[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const scope = await resolveActiveScope(user);
  const readScope = await resolveAnalyticsReadScope(user, scope);
  return services.analytics.listAllContactSessions(contactKey, readScope);
}
