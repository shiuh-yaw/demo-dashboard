/**
 * Batch-load the prospects bound to a set of demo-config records in a single
 * query pair, keyed by id. Demo-kind list loaders map each config to its bound
 * prospect for display; fetching that per-config (`services.prospects.get` in a
 * `.map`) is an N+1 (2 queries each) - use this to resolve them all at once.
 */

import { services } from "@/lib/services";
import type { Prospect } from "@/lib/services";
import { MAX_PAGE_LIMIT } from "@/lib/services/postgres/pagination";

export async function prospectsByIdFor(
  records: ReadonlyArray<{ prospectId?: string | null }>,
): Promise<Map<string, Prospect>> {
  const ids = [
    ...new Set(
      records
        .map((r) => r.prospectId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (ids.length === 0) return new Map();
  // Bounded by the caller's own MAX_PAGE_LIMIT config fetch, so one page covers it.
  const page = await services.prospects.list({
    where: { id: { in: ids } },
    limit: MAX_PAGE_LIMIT,
  });
  return new Map(page.items.map((p) => [p.id, p]));
}
