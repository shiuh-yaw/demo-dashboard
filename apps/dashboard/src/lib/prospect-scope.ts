/**
 * Prospect visibility scope: the team context (top-bar switcher) and the
 * My/Team/All filter combine into one authoritative `ProspectScope`. This
 * module is pure so the resolution is unit-testable; the server actions call
 * `resolveProspectScope` and never trust the raw cookie values.
 */

export const TEAM_CTX_COOKIE = "gtm-team-ctx";
export const PROSPECT_FILTER_COOKIE = "gtm-prospect-filter";

/**
 * Authoritative scope handed to the data layer. `mine.teamId` is set only
 * when My Prospects is viewed while a real permitted team context is active
 * - it narrows "mine" to that team, it never widens it.
 */
export type ProspectScope =
  | { kind: "mine"; teamId?: string }
  | { kind: "team"; teamId: string }
  | { kind: "all" };

export type ProspectFilter = "mine" | "team" | "all";

/** Raw team-context cookie sentinels; any other value is treated as a teamId. */
export const TEAM_CTX_PERSONAL = "personal";
export const TEAM_CTX_ALL = "all";

export interface ResolveScopeArgs {
  /** Raw `gtm-team-ctx` cookie: "personal" | "all" | a teamId | undefined. */
  ctx: string | undefined;
  /** Raw `gtm-prospect-filter` cookie: "mine" | "team" | "all" | undefined. */
  filter: string | undefined;
  isAdmin: boolean;
  memberTeamIds: Set<string>;
}

/** The filter that applies when the cookie is absent, given the team context. */
export function defaultFilter(args: {
  ctx: string | undefined;
  isAdmin: boolean;
  memberTeamIds: Set<string>;
}): ProspectFilter {
  const onTeam =
    !!args.ctx &&
    args.ctx !== TEAM_CTX_PERSONAL &&
    args.ctx !== TEAM_CTX_ALL &&
    (args.isAdmin || args.memberTeamIds.has(args.ctx));
  return onTeam ? "team" : "mine";
}

/** Normalize the raw filter cookie, dropping "all" for non-admins. */
export function normalizeFilter(
  raw: string | undefined,
  isAdmin: boolean,
  fallback: ProspectFilter,
): ProspectFilter {
  if (raw === "all") return isAdmin ? "all" : "mine";
  if (raw === "mine" || raw === "team") return raw;
  return fallback;
}

/**
 * Resolve the effective scope. Fails closed: "all" only for admins; "team"
 * only for a context the user is a member of (admins bypass). Anything else
 * collapses to "mine".
 */
/** A real, permitted (member or admin) team context - never "personal"/"all". */
function permittedTeamCtx(
  ctx: string | undefined,
  isAdmin: boolean,
  memberTeamIds: Set<string>,
): string | null {
  const isTeamCtx =
    !!ctx && ctx !== TEAM_CTX_PERSONAL && ctx !== TEAM_CTX_ALL;
  return isTeamCtx && (isAdmin || memberTeamIds.has(ctx!)) ? ctx! : null;
}

/**
 * Stable string key for a resolved scope. Lets a client-side cache/query key
 * (e.g. a TanStack Query `queryKey` for an SSR-seeded infinite list) vary
 * when the active scope changes, so switching My/Team/All or the team
 * context invalidates rather than silently keeping stale rows from a prior
 * scope around in the client cache.
 */
export function prospectScopeCacheKey(scope: ProspectScope): string {
  switch (scope.kind) {
    case "all":
      return "all";
    case "team":
      return `team:${scope.teamId}`;
    case "mine":
      return scope.teamId ? `mine:${scope.teamId}` : "mine";
  }
}

export function resolveProspectScope(args: ResolveScopeArgs): ProspectScope {
  const { ctx, isAdmin, memberTeamIds } = args;
  const filter = normalizeFilter(
    args.filter,
    isAdmin,
    defaultFilter({ ctx, isAdmin, memberTeamIds }),
  );

  if (filter === "all") return isAdmin ? { kind: "all" } : { kind: "mine" };
  if (filter === "mine") {
    const teamId = permittedTeamCtx(ctx, isAdmin, memberTeamIds);
    return teamId ? { kind: "mine", teamId } : { kind: "mine" };
  }

  // filter === "team": needs a real, permitted team context.
  const teamId = permittedTeamCtx(ctx, isAdmin, memberTeamIds);
  return teamId ? { kind: "team", teamId } : { kind: "mine" };
}
