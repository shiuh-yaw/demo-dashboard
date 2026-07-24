/**
 * Projects an `OrgContactView` page (raw prospect ids only - the analytics
 * read layer stays Tier-1-clean and never returns a name/label) into the
 * `ContactRow` shape the client list renders, resolving `prospectIds` to
 * display names in one batched lookup per page.
 *
 * Plain module (not "use server") so both the server component (first page)
 * and the "Load more" server action (subsequent pages, `./actions.ts`) share
 * this instead of duplicating the name-resolution + row-mapping logic - a
 * "use server" file may only export async functions, so this piece of the
 * pipeline has to live outside it.
 */

import { services, type OrgContactView, type Page } from "@/lib/services";
import { MAX_PAGE_LIMIT } from "@/lib/services/postgres/pagination";

/** `OrgContactView` plus display names for `prospectIds`, same order; a name
 * that didn't resolve (see `resolveProspectNames`) falls back to the raw id
 * rather than dropping the entry. */
export interface ContactRow extends OrgContactView {
  prospectNames: string[];
}

/** Distinct prospect ids touched across a page of org-wide contacts. */
function touchedProspectIds(items: readonly OrgContactView[]): string[] {
  return Array.from(new Set(items.flatMap((c) => c.prospectIds)));
}

/**
 * Resolves a page's touched prospect ids to display names. Bounded to
 * `MAX_PAGE_LIMIT` ids in one call - a page of contacts at demo-scale volumes
 * fits comfortably under that; any id that doesn't resolve (deleted
 * prospect, or an id count beyond the bound) falls back to the id itself.
 */
async function resolveProspectNames(
  items: readonly OrgContactView[],
): Promise<Record<string, string>> {
  const ids = touchedProspectIds(items);
  if (ids.length === 0) return {};
  const page = await services.prospects.list({
    where: { id: { in: ids } },
    limit: MAX_PAGE_LIMIT,
  });
  return Object.fromEntries(page.items.map((p) => [p.id, p.name]));
}

/** `Page<OrgContactView>` -> `Page<ContactRow>`, resolving names for this page only. */
export async function toContactRows(
  page: Page<OrgContactView>,
): Promise<Page<ContactRow>> {
  const names = await resolveProspectNames(page.items);
  return {
    nextCursor: page.nextCursor,
    items: page.items.map((c) => ({
      ...c,
      prospectNames: c.prospectIds.map((id) => names[id] ?? id),
    })),
  };
}
