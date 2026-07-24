/**
 * Prospect hub - Contacts. The enriched viewers table for this prospect.
 * Loads only the contacts read; the header + sub-nav come from the shared hub
 * layout (which also guards visibility before this segment renders).
 */

import { getSessionUser, visibleProspectIds } from "@/lib/auth/gtm";
import { services } from "@/lib/services";
import { ProspectContacts } from "../prospect-contacts";

interface ProspectContactsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProspectContactsPage({
  params,
}: ProspectContactsPageProps) {
  const { id } = await params;
  const user = await getSessionUser();

  // Two-tier read scope: only prospects this user may see. The read layer
  // returns nothing for a prospect out of scope (defense-in-depth beyond the
  // layout guard).
  const scope = user ? await visibleProspectIds(user) : new Set<string>();
  const contacts = await services.analytics.listProspectContacts(id, scope);

  return <ProspectContacts prospectId={id} contacts={contacts} />;
}
