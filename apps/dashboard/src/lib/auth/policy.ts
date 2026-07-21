/**
 * Authorization policy - the single owner of role comparisons. Pure
 * functions over the `Role` enum; no role strings appear at call sites.
 * Composition: global ADMIN/OWNER bypass scoping; a global VIEWER and a
 * team VIEWER never mutate; otherwise a user always mutates records they own
 * and, as a team OWNER/ADMIN, any record in that team. Non-members mutate
 * only their own records.
 */

import type { UserRole } from "@/lib/services";

export interface PolicyUser {
  id: string;
  dynamicUserId: string | null;
  role: UserRole;
}

export interface PolicyMembership {
  role: UserRole;
}

export interface PolicyRecord {
  /** Resolved creator FK; primary mutation-guard linkage. */
  createdById: string | null;
  /** Legacy Dynamic sub; fallback linkage for unclaimed rows. */
  ownerId: string | null;
}

/**
 * `membership` is the caller's membership in the RECORD's team, or null when
 * the caller is not a member (or the record has no team). Global OWNER/ADMIN
 * ignore it; global and team VIEWERs never mutate.
 */
export function canMutateRecord(
  user: PolicyUser,
  membership: PolicyMembership | null,
  record: PolicyRecord,
): boolean {
  if (user.role === "OWNER" || user.role === "ADMIN") return true;
  if (user.role === "VIEWER") return false;

  // Orphan rows (no creator attribution) are global ADMIN+ only (handled above).
  const isOrphan = !record.createdById && !record.ownerId;
  if (isOrphan) return false;

  // A team VIEWER is read-only even on records they created.
  if (membership?.role === "VIEWER") return false;

  // Creator may always mutate their own records (createdById wins over ownerId).
  const ownsRecord = record.createdById
    ? record.createdById === user.id
    : record.ownerId === user.dynamicUserId;
  if (ownsRecord) return true;

  // Team OWNER/ADMIN may mutate any record in that team.
  return membership?.role === "OWNER" || membership?.role === "ADMIN";
}

/** Create records: MEMBER+ (VIEWER is read-only). */
export function canCreateRecord(user: PolicyUser): boolean {
  return user.role !== "VIEWER";
}

/** Mint share links: MEMBER+. */
export function canMintShareLinks(user: PolicyUser): boolean {
  return user.role !== "VIEWER";
}

/** Operations surface (providers/webhooks/internal): ADMIN+. */
export function canAccessOperations(user: PolicyUser): boolean {
  return user.role === "OWNER" || user.role === "ADMIN";
}

/**
 * OWNER may set any role. ADMIN may only move a target between MEMBER and
 * VIEWER (never touch an ADMIN/OWNER, never promote to ADMIN/OWNER). Everyone
 * else never sets roles.
 */
export function canSetRole(
  actor: PolicyUser,
  targetCurrentRole: UserRole,
  newRole: UserRole,
): boolean {
  if (actor.role === "OWNER") return true;
  if (actor.role === "ADMIN") {
    const isLow = (r: UserRole) => r === "MEMBER" || r === "VIEWER";
    return isLow(targetCurrentRole) && isLow(newRole);
  }
  return false;
}
