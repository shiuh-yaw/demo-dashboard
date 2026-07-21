/**
 * GTM session + access model. Fail closed everywhere: an unverifiable JWT, an
 * off-domain email, a deactivated user, or an empty allowlist -> no access.
 * Role decisions live in ./policy.ts; this module resolves identity and the
 * team context those pure functions need.
 */

import { redirect } from "next/navigation";

import { env } from "@/env";
import { getCurrentUser } from "@/lib/auth/session";
import { services, DynamicUserIdConflictError } from "@/lib/services";
import type {
  GtmUser,
  GtmUserService,
  Prospect,
  ProspectService,
  TeamService,
} from "@/lib/services";
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

/** Comma-separated -> trimmed, lowercased, de-blanked domain list. */
export function parseAllowedDomains(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

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

/** Verified Dynamic session -> allowlist -> User (null on any failure). */
export async function getSessionUser(): Promise<GtmUser | null> {
  return resolveSessionUser({
    getCurrentUser,
    users: services.users,
    allowedDomains: parseAllowedDomains(env.GTM_ALLOWED_DOMAINS),
    onMismatch: warnMismatch,
  });
}

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
  prospects: Pick<ProspectService, "list" | "get">;
}

const defaultVisibilityDeps: VisibilityDeps = {
  teams: services.teams,
  prospects: services.prospects,
};

/**
 * Prospect ids visible to a user: ADMIN/OWNER are unscoped ("all"); everyone
 * else sees prospects they own (createdById, or ownerId for unclaimed rows)
 * plus prospects of teams they belong to. With zero memberships this is
 * mine-only.
 */
export async function visibleProspectIds(
  user: GtmUser,
  deps: VisibilityDeps = defaultVisibilityDeps,
): Promise<"all" | Set<string>> {
  if (user.role === "OWNER" || user.role === "ADMIN") return "all";
  const memberships = await deps.teams.membershipsForUser(user.id);
  const teamIds = new Set(memberships.map((m) => m.teamId));
  const all = await deps.prospects.list();
  const ids = new Set<string>();
  for (const p of all) {
    const owns = p.createdById
      ? p.createdById === user.id
      : p.ownerId === user.dynamicUserId;
    const inTeam = p.teamId != null && teamIds.has(p.teamId);
    if (owns || inTeam) ids.add(p.id);
  }
  return ids;
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
    : record.ownerId === user.dynamicUserId;
  if (owns) return true;
  if (record.prospectId != null) return visible.has(record.prospectId);
  return false;
}

// =============================================================================
// Mutation guards (resolve team + membership, then delegate to policy.ts)
// =============================================================================

export interface MutateDeps {
  teams: Pick<TeamService, "membershipsForUser">;
  prospects: Pick<ProspectService, "get">;
}

const defaultMutateDeps: MutateDeps = {
  teams: services.teams,
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
