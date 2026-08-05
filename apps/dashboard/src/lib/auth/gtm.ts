/**
 * GTM session + access model. Fail closed everywhere: an unverifiable JWT, an
 * off-domain email, a deactivated user, or an empty allowlist -> no access.
 * Role decisions live in ./policy.ts; this module resolves identity and the
 * team context those pure functions need.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Prisma } from "@dynamic-demos/db";
import { env } from "@/env";
import { getCurrentUser } from "@/lib/auth/session";
import { services, DynamicUserIdConflictError } from "@/lib/services";
import type {
  AnalyticsReadScope,
  GtmUser,
  GtmUserService,
  Prospect,
  ProspectService,
  TeamService,
} from "@/lib/services";
import {
  resolveProspectScope,
  TEAM_CTX_COOKIE,
  PROSPECT_FILTER_COOKIE,
  type ProspectScope,
} from "@/lib/prospect-scope";
import {
  canAccessOperations,
  canMutateRecord,
  type PolicyMembership,
  type PolicyRecord,
} from "./policy";

/** Droplet-styled "ask an owner/admin for access" page. */
export const GTM_DENIED_PATH = "/dashboard/denied";

// =============================================================================
// Domain allowlist (pure)
// =============================================================================

/**
 * Who may reach the operator surface. Hardcoded, not env-driven: the two
 * corporate domains are the answer in every environment, and an env var for
 * them is a way to get it wrong - an unset var fails closed and locks everyone
 * out (which is what it did locally), a mistyped one silently admits nobody.
 * In code, widening the allowlist needs a diff and a review.
 *
 * Lowercase, and exact-match only - see `emailDomainAllowed`.
 */
export const ALLOWED_EMAIL_DOMAINS: readonly string[] = [
  "fireblocks.com",
  "dynamic.xyz",
];

/**
 * Exact match on the full domain after `@`, lowercased. Empty allowlist ->
 * nobody passes. No substring / subdomain match (`evil-fireblocks.com` and
 * `sub.fireblocks.com` never pass for `fireblocks.com`).
 */
export function emailDomainAllowed(email: string, allowed: string[]): boolean {
  if (allowed.length === 0) return false;
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;
  return allowed.includes(domain);
}

// =============================================================================
// Session resolution
// =============================================================================

export interface SessionUserDeps {
  getCurrentUser: () => Promise<{ sub: string; email?: string } | null>;
  users: Pick<
    GtmUserService,
    "getOrCreateByEmail" | "update" | "claimLegacyRecords"
  >;
  allowedDomains: string[];
  /** Invoked when a stored dynamicUserId differs from the session sub. */
  onMismatch?: (info: { userId: string; existing: string; attempted: string }) => void;
}

/**
 * Verified session -> allowlisted email -> User row. Captures dynamicUserId
 * write-once on first sight (then one-shot claimLegacyRecords) and returns
 * null on any failure. Team membership is explicit-only: no auto-join. Never
 * seeds roles.
 */
export async function resolveSessionUser(
  deps: SessionUserDeps,
): Promise<GtmUser | null> {
  const payload = await deps.getCurrentUser();
  if (!payload) return null;

  const email = payload.email?.trim().toLowerCase();
  const sub = payload.sub;
  if (!email || !sub) return null;
  if (!emailDomainAllowed(email, deps.allowedDomains)) return null;

  let user = await deps.users.getOrCreateByEmail(email);

  // Offboarded users are rejected exactly like off-domain.
  if (user.deactivatedAt) return null;

  if (user.dynamicUserId == null) {
    try {
      user = await deps.users.update(user.id, { dynamicUserId: sub });
      // First sub capture -> one-shot legacy createdById reconciliation.
      await deps.users.claimLegacyRecords({
        id: user.id,
        dynamicUserId: sub,
      });
    } catch (err) {
      if (err instanceof DynamicUserIdConflictError) {
        deps.onMismatch?.({
          userId: user.id,
          existing: err.existing,
          attempted: sub,
        });
      } else {
        throw err;
      }
    }
  } else if (user.dynamicUserId !== sub) {
    // Same email, different sub than stored - log, keep original, never overwrite.
    deps.onMismatch?.({
      userId: user.id,
      existing: user.dynamicUserId,
      attempted: sub,
    });
  }

  return user;
}

function warnMismatch(info: {
  userId: string;
  existing: string;
  attempted: string;
}): void {
  console.warn(
    `[gtm-auth] dynamicUserId mismatch for user ${info.userId}: kept "${info.existing}", ignored "${info.attempted}"`,
  );
}

/**
 * Verified Dynamic session -> allowlist -> User (null on any failure).
 * `React.cache()`-memoized per request only - never cache identity across
 * requests, this must re-resolve on every new render tree.
 */
export const getSessionUser = cache(async (): Promise<GtmUser | null> => {
  return resolveSessionUser({
    getCurrentUser,
    users: services.users,
    allowedDomains: [...ALLOWED_EMAIL_DOMAINS],
    onMismatch: warnMismatch,
  });
});

/** Route/layout guard: redirect to the denied page when unauthenticated. */
export async function requireUser(): Promise<GtmUser> {
  const user = await getSessionUser();
  if (!user) redirect(GTM_DENIED_PATH);
  return user;
}

/** Route/layout guard: ADMIN+ only, fail closed to the denied page. */
export async function requireAdmin(): Promise<GtmUser> {
  const user = await requireUser();
  if (!canAccessOperations(user)) redirect(GTM_DENIED_PATH);
  return user;
}

// =============================================================================
// Visibility (progressive: own + team, ADMIN/OWNER unscoped)
// =============================================================================

export interface VisibilityDeps {
  teams: Pick<TeamService, "membershipsForUser">;
  prospects: Pick<ProspectService, "listIds">;
}

/** Request-memoized team memberships; never cache across requests (authz must not leak). */
export const membershipsForUserCached = cache((userId: string) =>
  services.teams.membershipsForUser(userId),
);

/** Shared teams dep whose membership read is request-deduped across every caller. */
const cachedTeamsDep: Pick<TeamService, "membershipsForUser"> = {
  membershipsForUser: membershipsForUserCached,
};

const defaultVisibilityDeps: VisibilityDeps = {
  teams: cachedTeamsDep,
  prospects: services.prospects,
};

/**
 * Prospect ids visible to a user: ADMIN/OWNER are unscoped ("all"); everyone
 * else sees prospects they own (createdById, or ownerId for unclaimed rows)
 * plus prospects of teams they belong to. With zero memberships this is
 * mine-only. Queried as a single scoped id-only projection - never a
 * full-table list filtered in JS. `React.cache()`-memoized per request only
 * (keyed on the `user` reference, which is stable for one request since
 * callers pass `getSessionUser()`'s own cached result) - never cache across
 * requests.
 */
export const visibleProspectIds = cache(async function visibleProspectIds(
  user: GtmUser,
  deps: VisibilityDeps = defaultVisibilityDeps,
): Promise<"all" | Set<string>> {
  if (user.role === "OWNER" || user.role === "ADMIN") return "all";
  const memberships = await deps.teams.membershipsForUser(user.id);
  const teamIds = memberships.map((m) => m.teamId);
  const ids = await deps.prospects.listIds({
    OR: [ownWhere(user), { teamId: { in: teamIds } }],
  });
  return new Set(ids);
});

/**
 * Active My/Team/All scope (team switcher x filter) for a session user,
 * re-derived from cookies every call - the single resolver every list action
 * shares so cookie reads + membership lookups never get duplicated. Distinct
 * from `visibleProspectIds`: that is broad (own + every team) authorization
 * for single-record `get()`; this is the narrow, user-facing filter for lists.
 */
export async function resolveActiveScope(
  user: GtmUser,
  deps: Pick<VisibilityDeps, "teams"> = defaultVisibilityDeps,
): Promise<ProspectScope> {
  const memberships = await deps.teams.membershipsForUser(user.id);
  const memberTeamIds = new Set(memberships.map((m) => m.teamId));
  const store = await cookies();
  return resolveProspectScope({
    ctx: store.get(TEAM_CTX_COOKIE)?.value,
    filter: store.get(PROSPECT_FILTER_COOKIE)?.value,
    isAdmin: isAdminRole(user),
    memberTeamIds,
  });
}

/**
 * `AnalyticsReadScope` for an already-resolved active `ProspectScope` - the
 * analytics-read-layer sibling of `prospectScopeWhere`, for `AnalyticsService`
 * methods (e.g. `listAllContacts`) that take the counts-style
 * `"all" | Set<string>` shape instead of a raw Prisma where fragment.
 * Callers resolve `ProspectScope` once via `resolveActiveScope` (they
 * typically need it anyway, e.g. for a client cache key) and pass it in here
 * rather than this re-deriving it and re-querying team memberships. "all"
 * only when the user is actually admin (mirrors `prospectScopeWhere`
 * returning `{}` only in that case) - never widens what `resolveActiveScope`
 * already fail-closed to.
 */
export async function resolveAnalyticsReadScope(
  user: Pick<GtmUser, "id" | "dynamicUserId" | "role">,
  scope: ProspectScope,
  deps: Pick<VisibilityDeps, "prospects"> = defaultVisibilityDeps,
): Promise<AnalyticsReadScope> {
  if (scope.kind === "all" && isAdminRole(user)) return "all";
  const ids = await deps.prospects.listIds(prospectScopeWhere(user, scope));
  return new Set(ids);
}

/** Prospect-scoped visibility for a resolved prospect id. */
export function isProspectVisible(
  visible: "all" | Set<string>,
  prospectId: string | null,
): boolean {
  if (visible === "all") return true;
  if (prospectId == null) return false;
  return visible.has(prospectId);
}

/**
 * Whether a user may VIEW an already-fetched prospect row - the in-memory,
 * single-row sibling of `visibleProspectIds`, for callers that already hold
 * the row (via a request-cached read) and only need to authorize that one id,
 * instead of scanning the full visible-id set. Mirrors `visibleProspectIds`
 * exactly: ADMIN/OWNER unscoped; everyone else sees prospects they own
 * (createdById, or the ownerId fallback for unclaimed rows) plus prospects of
 * any team they belong to. Reuses the request-cached membership read, so it
 * adds no query when memberships were already resolved this request - and none
 * at all for own/admin.
 */
export async function canViewProspect(
  user: Pick<GtmUser, "id" | "dynamicUserId" | "role">,
  prospect: Pick<Prospect, "teamId" | "createdById" | "ownerId">,
  deps: Pick<VisibilityDeps, "teams"> = defaultVisibilityDeps,
): Promise<boolean> {
  if (isAdminRole(user)) return true;
  // Own record - mirrors `ownWhere`: createdById wins outright when set; the
  // ownerId(dynamicUserId) fallback applies only to unclaimed rows.
  const owns = prospect.createdById
    ? prospect.createdById === user.id
    : !!user.dynamicUserId && prospect.ownerId === user.dynamicUserId;
  if (owns) return true;
  if (!prospect.teamId) return false;
  const memberships = await deps.teams.membershipsForUser(user.id);
  return memberships.some((m) => m.teamId === prospect.teamId);
}

/**
 * Where-fragment for a resolved visibility set - the DB-query sibling of
 * `isProspectVisible`. Used by callers that need full prospect rows (not
 * just ids) scoped to what `visibleProspectIds` already computed, e.g. the
 * prospect picker and the demos-table join.
 */
export function prospectVisibilityWhere(
  visible: "all" | Set<string>,
): Prisma.ProspectWhereInput {
  return visible === "all" ? {} : { id: { in: Array.from(visible) } };
}

/**
 * Demo-config visibility: own records (createdById, or ownerId for unclaimed
 * rows) are always visible, even when bound to a prospect the user cannot
 * see - own-record visibility is never derived through prospect visibility.
 * A non-owned bound demo follows its prospect's visibility; a non-owned
 * unbound demo (null prospectId) is visible only to ADMIN/OWNER.
 */
export function isDemoConfigVisible(
  user: Pick<GtmUser, "id" | "dynamicUserId">,
  visible: "all" | Set<string>,
  record: { prospectId: string | null; createdById: string | null; ownerId: string | null },
): boolean {
  if (visible === "all") return true;
  const owns = record.createdById
    ? record.createdById === user.id
    : !!record.ownerId && record.ownerId === user.dynamicUserId;
  if (owns) return true;
  if (record.prospectId != null) return visible.has(record.prospectId);
  return false;
}

// =============================================================================
// Scope -> Prisma WHERE builders (pure, no IO; mirrors visibleProspectIds /
// isDemoConfigVisible exactly, just expressed as a where fragment instead of
// a post-fetch JS filter)
// =============================================================================

/** Fail-closed: matches no row. Used whenever scope is missing or invalid. */
const NONE_WHERE = { id: { in: [] as string[] } };

function isAdminRole(user: Pick<GtmUser, "role">): boolean {
  return user.role === "OWNER" || user.role === "ADMIN";
}

type OwnClause = { createdById: string } | { createdById: null; ownerId: string };

/**
 * Own-record where fragment: createdById match, else legacy ownerId
 * (dynamicUserId) fallback for a still-unclaimed row. Exactly mirrors
 * `ownsProspect`'s ternary (createdById wins outright when set; the ownerId
 * fallback only ever applies to unclaimed rows) - not a plain
 * `ownerId=X OR createdById=Y`, which would incorrectly re-admit a row
 * reassigned away from this user (legacy `ownerId` is never rewritten on
 * reassignment, see `canReassignProspect`).
 */
function ownWhere(user: Pick<GtmUser, "id" | "dynamicUserId">): { OR: OwnClause[] } {
  const clauses: OwnClause[] = [{ createdById: user.id }];
  if (user.dynamicUserId) {
    clauses.push({ createdById: null, ownerId: user.dynamicUserId });
  }
  return { OR: clauses };
}

/**
 * Prospect visibility as a Prisma where fragment, given an already-enforced
 * `ProspectScope` (see `enforceScope` in lib/actions/prospects.ts, which
 * downgrades a non-admin "all" or a non-member "team" request to "mine"
 * before scope ever reaches here). Fails closed defensively on top of that:
 * a missing/invalid scope, or "all" from a caller that skipped enforcement,
 * never falls through to unscoped access.
 */
export function prospectScopeWhere(
  user: Pick<GtmUser, "id" | "dynamicUserId" | "role">,
  scope: ProspectScope | undefined | null,
): Prisma.ProspectWhereInput {
  if (!scope) return NONE_WHERE;
  switch (scope.kind) {
    case "all":
      return isAdminRole(user) ? {} : NONE_WHERE;
    case "team":
      return scope.teamId ? { teamId: scope.teamId } : NONE_WHERE;
    case "mine":
      return scope.teamId
        ? { AND: [ownWhere(user), { teamId: scope.teamId }] }
        : ownWhere(user);
    default:
      return NONE_WHERE;
  }
}

/**
 * DemoConfig visibility as a Prisma where fragment for an already-resolved
 * `visibleProspectIds` set - the DB-query sibling of `isDemoConfigVisible`,
 * exactly like `prospectVisibilityWhere` is the sibling of `isProspectVisible`.
 * Own records match unconditionally; a bound non-owned record follows the
 * resolved visible set; an unbound non-owned record never matches outside
 * `"all"`. Takes a resolved `visible` set (own + every team the user belongs
 * to); a `ProspectScope` "team" value only ever covers one team, so it cannot
 * reproduce `visibleProspectIds`' multi-team union.
 */
export function demoConfigVisibilityWhere(
  user: Pick<GtmUser, "id" | "dynamicUserId">,
  visible: "all" | Set<string>,
): Prisma.DemoConfigWhereInput {
  if (visible === "all") return {};
  return { OR: [ownWhere(user), { prospectId: { in: Array.from(visible) } }] };
}

/**
 * DemoConfig where-fragment for the ACTIVE My/Team/All scope (team switcher x
 * filter) - the list-filtering sibling of `demoConfigVisibilityWhere`, which
 * stays broad (own + every team) for single-record `get()` authorization only.
 * "team" here is team-bound configs only
 * (personal/unbound configs never appear under a team view); "mine" with no
 * active team is every own config (incl. unbound) plus configs on prospects
 * the user owns; "mine" narrowed to a team is configs on the user's OWN
 * prospects within that team only - a personal/unbound config never appears
 * under a team-scoped "mine", even though it is still the user's own config.
 */
export function demoConfigActiveScopeWhere(
  user: Pick<GtmUser, "id" | "dynamicUserId" | "role">,
  scope: ProspectScope | undefined | null,
): Prisma.DemoConfigWhereInput {
  if (!scope) return NONE_WHERE;
  switch (scope.kind) {
    case "all":
      return isAdminRole(user) ? {} : NONE_WHERE;
    case "team":
      return scope.teamId ? { prospect: { teamId: scope.teamId } } : NONE_WHERE;
    case "mine":
      if (scope.teamId) {
        return {
          OR: [
            { AND: [ownWhere(user), { prospect: { teamId: scope.teamId } }] },
            {
              prospect: {
                AND: [prospectScopeWhere(user, { kind: "mine" }), { teamId: scope.teamId }],
              },
            },
          ],
        };
      }
      return { OR: [ownWhere(user), { prospect: prospectScopeWhere(user, scope) }] };
    default:
      return NONE_WHERE;
  }
}

// =============================================================================
// Mutation guards (resolve team + membership, then delegate to policy.ts)
// =============================================================================

export interface MutateDeps {
  teams: Pick<TeamService, "membershipsForUser">;
  prospects: Pick<ProspectService, "get">;
}

const defaultMutateDeps: MutateDeps = {
  teams: cachedTeamsDep,
  prospects: services.prospects,
};

async function membershipForTeam(
  user: GtmUser,
  teamId: string,
  deps: MutateDeps,
): Promise<PolicyMembership | null> {
  const memberships = await deps.teams.membershipsForUser(user.id);
  return memberships.find((m) => m.teamId === teamId) ?? null;
}

/** Guard for Prospect edit/delete. Record's team is on the row (may be null). */
export async function canMutateProspect(
  user: GtmUser,
  prospect: Pick<Prospect, "teamId" | "createdById" | "ownerId">,
  deps: MutateDeps = defaultMutateDeps,
): Promise<boolean> {
  if (user.role === "OWNER" || user.role === "ADMIN") return true;
  if (user.role === "VIEWER") return false;
  const membership = prospect.teamId
    ? await membershipForTeam(user, prospect.teamId, deps)
    : null;
  return canMutateRecord(user, membership, prospect as PolicyRecord);
}

/**
 * Guard for Prospect owner/team reassignment. Stricter than `canMutateProspect`:
 * team OWNER/ADMIN does NOT qualify here - only the current owner or a global
 * ADMIN/OWNER may reassign. These fields drive two-tier visibility
 * (`visibleProspectIds`), so a team lead widening their own team's reach by
 * reassigning a peer's prospect is exactly the escalation this guard exists
 * to block. Pure - no team-membership lookup needed.
 */
export function canReassignProspect(
  user: Pick<GtmUser, "id" | "dynamicUserId" | "role">,
  /** `ownerId` widened past `Prospect`'s (required) column - the legacy
   * `ProspectProfile` aggregate surfaces it as optional. */
  prospect: { createdById: string | null; ownerId: string | null | undefined },
): boolean {
  if (user.role === "OWNER" || user.role === "ADMIN") return true;
  if (user.role === "VIEWER") return false;
  return prospect.createdById
    ? prospect.createdById === user.id
    : !!prospect.ownerId && prospect.ownerId === user.dynamicUserId;
}

/**
 * Guard for DemoConfig edit/delete. DemoConfig has no teamId column - its team
 * comes from the linked prospect (may be null); unbound demos have no team, so
 * the mutation decision falls to own-record ownership in policy.
 */
export async function canMutateDemoConfig(
  user: GtmUser,
  record: PolicyRecord & { prospectId: string | null },
  deps: MutateDeps = defaultMutateDeps,
): Promise<boolean> {
  if (user.role === "OWNER" || user.role === "ADMIN") return true;
  if (user.role === "VIEWER") return false;
  const teamId = record.prospectId
    ? (await deps.prospects.get(record.prospectId))?.teamId ?? null
    : null;
  const membership = teamId ? await membershipForTeam(user, teamId, deps) : null;
  return canMutateRecord(user, membership, record);
}
