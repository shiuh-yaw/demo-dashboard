/**
 * Pure helpers for the internal demo-detail two-tier analytics. No server
 * imports, so the security-critical scoping is unit-testable in isolation.
 *
 * Two tiers:
 *  - Tier 1 (aggregate): counts across ALL prospects running a demo kind,
 *    optionally narrowed to a prospect-id scope (the My/Team filter). Computed
 *    by `services.analytics.demoKindSummary`; no per-prospect identity leaks.
 *  - Tier 2 (detail rows): per-prospect breakdown, gated to prospects the
 *    viewer may see via `visibleKindConfigs`. A prospect outside visibility
 *    still counts toward Tier 1 but never becomes a detail row.
 */

import type { DemoConfigKind } from "@/lib/services/types";

/**
 * Kinds the prospect hub can auto-create/bind via `createMissingDemos` -
 * identity map (kind -> itself), kept as a map rather than a plain Set so
 * `isConfigurableKind` narrows to this literal union.
 */
export const CONFIGURABLE_KIND_TO_DEMO_TYPE = {
  earn: "earn",
  checkout: "checkout",
  wallet: "wallet",
  remittance: "remittance",
  trade: "trade",
  flow: "flow",
  card: "card",
  connections: "connections",
  accounts: "accounts",
  "visa-direct": "visa-direct",
  rimau: "rimau",
} as const satisfies Partial<Record<DemoConfigKind, DemoConfigKind>>;

export type ConfigurableKind = keyof typeof CONFIGURABLE_KIND_TO_DEMO_TYPE;

/** True when this demo kind can be branded for a prospect from here. */
export function isConfigurableKind(kind: string): kind is ConfigurableKind {
  return kind in CONFIGURABLE_KIND_TO_DEMO_TYPE;
}

/** Prospect fields needed to classify a prospect as owned / team-owned. */
export interface ClassifiableProspect {
  id: string;
  teamId: string | null;
  ownerId: string | null;
  createdById: string | null;
}

/** Owner identity - resolved createdById wins, else legacy ownerId vs sub. */
export interface OwnerIdentity {
  id: string;
  dynamicUserId: string | null;
}

/** Mirrors `lib/auth/gtm` ownership: createdById, else ownerId == dynamicUserId. */
export function prospectOwnedBy(
  user: OwnerIdentity,
  p: Pick<ClassifiableProspect, "ownerId" | "createdById">,
): boolean {
  return p.createdById
    ? p.createdById === user.id
    : !!p.ownerId && p.ownerId === user.dynamicUserId;
}

/** Prospect-id scopes for the My/Team aggregate filter (both subsets of visible). */
export interface KindScopes {
  mine: Set<string>;
  team: Set<string>;
}

/** Build the My / Team prospect-id scopes from the full prospect list. */
export function computeKindScopes(
  user: OwnerIdentity,
  prospects: ClassifiableProspect[],
  teamIds: ReadonlySet<string>,
): KindScopes {
  const mine = new Set<string>();
  const team = new Set<string>();
  for (const p of prospects) {
    if (prospectOwnedBy(user, p)) mine.add(p.id);
    if (p.teamId != null && teamIds.has(p.teamId)) team.add(p.id);
  }
  return { mine, team };
}

/** Minimal demo-config shape for the Tier-2 gate. */
export interface KindConfig {
  id: string;
  prospectId: string | null;
}

/**
 * Tier-2 gate: the configs that may surface as per-prospect detail rows.
 * Only configs bound to a prospect the viewer can see survive; unbound
 * configs (null prospectId) never become detail rows. Their sessions still
 * count toward the Tier-1 aggregate, but no identity is exposed here.
 */
export function visibleKindConfigs<T extends KindConfig>(
  configs: T[],
  visible: "all" | ReadonlySet<string>,
): T[] {
  return configs.filter(
    (c) =>
      c.prospectId != null &&
      (visible === "all" || visible.has(c.prospectId)),
  );
}
