/**
 * Demos-table query model. One cross-kind list over every `DemoConfig` row
 * joined to its Prospect and creator, scoped by GTM visibility and filterable.
 * The pure builder is unit-tested; `listDemoTableRows` fetches the inputs and
 * delegates to it. Sessions/viewers come from the analytics stub at the call
 * site (Phase GTM-08 fills the numbers).
 */

import {
  demoConfigVisibilityWhere,
  isDemoConfigVisible,
  prospectVisibilityWhere,
  visibleProspectIds,
} from "@/lib/auth/gtm";
import { services } from "@/lib/services";
import { MAX_PAGE_LIMIT } from "@/lib/services/postgres/pagination";
import type {
  DemoConfigKind,
  DemoConfigRecord,
  GtmUser,
  Prospect,
  ProspectLogoKind,
} from "@/lib/services";

export interface DemoTableRow {
  id: string;
  kind: DemoConfigKind;
  name: string | null;
  createdAt: Date;
  prospect: {
    id: string;
    name: string;
    domain: string | null;
    logo: ProspectLogoKind;
    logoUrl: string | null;
  } | null;
  creator: { id: string; displayName: string | null; email: string } | null;
}

export interface DemoTableFilters {
  kind?: DemoConfigKind;
  /** GtmUser.id of the creator. */
  creatorId?: string;
  prospectId?: string;
  /** Case-insensitive substring match on the bound prospect's name. */
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Pure: filter by visibility, then by the supplied filters, then join
 * prospect + creator, newest first. Unbound demos are dropped when a
 * name search is active (nothing to match against).
 */
export function buildDemoTableRows(
  user: Pick<GtmUser, "id" | "dynamicUserId">,
  visible: "all" | Set<string>,
  demoConfigs: DemoConfigRecord[],
  prospectsById: Map<string, Prospect>,
  usersById: Map<string, GtmUser>,
  filters: DemoTableFilters = {},
): DemoTableRow[] {
  const search = filters.search?.trim().toLowerCase();

  return demoConfigs
    .filter((d) =>
      isDemoConfigVisible(user, visible, {
        prospectId: d.prospectId,
        createdById: d.createdById,
        ownerId: d.ownerId,
      }),
    )
    .filter((d) => (filters.kind ? d.kind === filters.kind : true))
    .filter((d) => (filters.creatorId ? d.createdById === filters.creatorId : true))
    .filter((d) => (filters.prospectId ? d.prospectId === filters.prospectId : true))
    .filter((d) => (filters.createdAfter ? d.createdAt >= filters.createdAfter : true))
    .filter((d) => (filters.createdBefore ? d.createdAt <= filters.createdBefore : true))
    .filter((d) => {
      if (!search) return true;
      const p = d.prospectId ? prospectsById.get(d.prospectId) : null;
      return p ? p.name.toLowerCase().includes(search) : false;
    })
    .map((d): DemoTableRow => {
      const p = d.prospectId ? prospectsById.get(d.prospectId) ?? null : null;
      const c = d.createdById ? usersById.get(d.createdById) ?? null : null;
      return {
        id: d.id,
        kind: d.kind,
        name: d.name,
        createdAt: d.createdAt,
        prospect: p
          ? {
              id: p.id,
              name: p.name,
              domain: p.domain,
              logo: p.logo,
              logoUrl: p.logoUrl,
            }
          : null,
        creator: c ? { id: c.id, displayName: c.displayName, email: c.email } : null,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Fetches every DemoConfig page in scope, looping the cursor until exhausted -
 * scoped + kind-filtered at the DB, never a `.list().filter()` over a single
 * capped page (the table needs the complete scoped set, not one page of it;
 * "Load more" pagination for this table is Task 8's UI concern).
 */
async function fetchAllVisibleDemoConfigs(
  user: Pick<GtmUser, "id" | "dynamicUserId">,
  visible: "all" | Set<string>,
  kind?: DemoConfigKind,
): Promise<DemoConfigRecord[]> {
  const where = demoConfigVisibilityWhere(user, visible);
  const items: DemoConfigRecord[] = [];
  let cursor: string | null = null;
  for (;;) {
    const page = await services.demoConfigs.list({
      where,
      kind,
      cursor,
      limit: MAX_PAGE_LIMIT,
    });
    items.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return items;
}

/**
 * Fetch every demo config in scope, resolve visibility for `user`, and build
 * the table rows. Creators are batch-resolved by id; prospects by the visible
 * set plus any bound prospect a user owns.
 */
export async function listDemoTableRows(
  user: GtmUser,
  filters: DemoTableFilters = {},
): Promise<DemoTableRow[]> {
  const visible = await visibleProspectIds(user);
  const [demoConfigs, prospectsPage] = await Promise.all([
    fetchAllVisibleDemoConfigs(user, visible, filters.kind),
    // Bounded join fetch (not a paginated list) - every visible prospect,
    // capped at MAX_PAGE_LIMIT, to resolve the demo rows' prospect column.
    services.prospects.list({
      where: prospectVisibilityWhere(visible),
      limit: MAX_PAGE_LIMIT,
    }),
  ]);

  const prospectsById = new Map(prospectsPage.items.map((p) => [p.id, p]));

  const creatorIds = Array.from(
    new Set(demoConfigs.map((d) => d.createdById).filter((id): id is string => id != null)),
  );
  const usersById = new Map<string, GtmUser>();
  await Promise.all(
    creatorIds.map(async (id) => {
      const u = await services.users.get(id);
      if (u) usersById.set(id, u);
    }),
  );

  return buildDemoTableRows(user, visible, demoConfigs, prospectsById, usersById, filters);
}
