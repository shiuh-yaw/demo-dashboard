/**
 * Workspace Contacts - org-wide "who has been viewing" roll-up across every
 * prospect in the operator's ACTIVE scope (My/Team/All), grouped by viewer
 * identity exactly like the per-prospect Contacts tab
 * (`prospects/[id]/contacts/page.tsx`). Scope here is the ACTIVE selected
 * scope (`resolveActiveScope` + `resolveAnalyticsReadScope`), not the broad
 * `visibleProspectIds` Tier-1 set - switching the team/filter switcher
 * changes what appears here, same as the Prospects/Demos lists.
 */

import {
  getSessionUser,
  resolveActiveScope,
  resolveAnalyticsReadScope,
} from "@/lib/auth/gtm";
import { prospectScopeCacheKey } from "@/lib/prospect-scope";
import { services } from "@/lib/services";
import type { Page } from "@/lib/services";
import { ContactsWorkspaceList } from "./contacts-workspace-list";
import { toContactRows, type ContactRow } from "./contact-row";

export const dynamic = "force-dynamic";

const EMPTY_PAGE: Page<ContactRow> = { items: [], nextCursor: null };

export default async function ContactsPage() {
  const user = await getSessionUser();
  if (!user) {
    return <ContactsWorkspaceList initialPage={EMPTY_PAGE} scopeKey="none" />;
  }

  const scope = await resolveActiveScope(user);
  const readScope = await resolveAnalyticsReadScope(user, scope);
  // Identified viewers only, matching the client's default toggle state so the
  // SSR-seeded first page is the one the list actually renders.
  const page = await services.analytics.listAllContacts(readScope, undefined, {
    includeAnonymous: false,
  });
  const initialPage = await toContactRows(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone who has viewed a demo across your prospects, grouped by
          viewer identity.
        </p>
      </div>
      <ContactsWorkspaceList
        initialPage={initialPage}
        scopeKey={prospectScopeCacheKey(scope)}
      />
    </div>
  );
}
