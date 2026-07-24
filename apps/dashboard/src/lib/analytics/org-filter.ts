/**
 * Pure helpers for the org analytics demo filter. No server imports, so the
 * client-input parsing and the config->kind narrowing stay unit-testable in
 * isolation - the filter narrows counts-only inputs, never widens scope.
 */

import type { DemoConfigKind } from "@/lib/services/types";

/** Sentinel meaning "every demo kind" - the default org filter. */
export const ORG_DEMO_FILTER_ALL = "all" as const;

/** The demo filter the org analytics dashboard offers: one kind or all. */
export type OrgDemoFilter = DemoConfigKind | typeof ORG_DEMO_FILTER_ALL;

const KINDS: ReadonlySet<string> = new Set<DemoConfigKind>([
  "earn",
  "wallet",
  "trade",
  "visa-direct",
  "checkout",
  "remittance",
]);

/** Coerce untrusted client input to a known filter; anything else is "all". */
export function parseOrgDemoFilter(raw: string | null | undefined): OrgDemoFilter {
  if (raw && KINDS.has(raw)) return raw as DemoConfigKind;
  return ORG_DEMO_FILTER_ALL;
}

/**
 * Narrow the config->kind map to a single kind, returning the (possibly
 * narrowed) map plus the matching config ids. "all" passes the map through.
 * Only shrinks the input set, never adds ids the caller did not resolve.
 */
export function narrowKindMap(
  kindByConfigId: ReadonlyMap<string, DemoConfigKind>,
  filter: OrgDemoFilter,
): { kindByConfigId: Map<string, DemoConfigKind>; demoConfigIds: string[] } {
  if (filter === ORG_DEMO_FILTER_ALL) {
    return {
      kindByConfigId: new Map(kindByConfigId),
      demoConfigIds: [...kindByConfigId.keys()],
    };
  }
  const narrowed = new Map<string, DemoConfigKind>();
  for (const [id, kind] of kindByConfigId) {
    if (kind === filter) narrowed.set(id, kind);
  }
  return { kindByConfigId: narrowed, demoConfigIds: [...narrowed.keys()] };
}

/** Distinct kinds present in the map, for the filter's option list. */
export function availableKinds(
  kindByConfigId: ReadonlyMap<string, DemoConfigKind>,
): DemoConfigKind[] {
  return [...new Set(kindByConfigId.values())];
}
