"use server";

/**
 * Team + membership administration. Server-side only; no UI (Phase 07).
 * Admin-gated: the actor must be a global ADMIN+ (canAccessOperations).
 * Grantable/settable membership roles are bounded by the canSetRole matrix
 * (an ADMIN may only assign MEMBER/VIEWER). Team-lead self-management for
 * non-global-admins is deferred to Phase 07.
 */

import { getSessionUser } from "@/lib/auth/gtm";
import { canAccessOperations, canSetRole } from "@/lib/auth/policy";
import { services } from "@/lib/services";
import type { Team, TeamMembership, UserRole } from "@/lib/services";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createTeam(
  name: string,
  slug: string,
): Promise<ActionResult<Team>> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Authentication required" };
  if (!canAccessOperations(actor)) {
    return { success: false, error: "Access denied" };
  }
  try {
    return { success: true, data: await services.teams.create({ name, slug }) };
  } catch (err) {
    console.error("Failed to create team:", err);
    return { success: false, error: "Failed to create team" };
  }
}

export async function addTeamMember(
  userId: string,
  teamId: string,
  role: UserRole = "MEMBER",
): Promise<ActionResult<TeamMembership>> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Authentication required" };
  // Admin-gated, and the actor may only grant a role canSetRole permits.
  if (!canAccessOperations(actor) || !canSetRole(actor, role, role)) {
    return { success: false, error: "Access denied" };
  }
  try {
    return {
      success: true,
      data: await services.teams.addMember(userId, teamId, role),
    };
  } catch (err) {
    console.error("Failed to add team member:", err);
    return { success: false, error: "Failed to add team member" };
  }
}

export async function removeTeamMember(
  userId: string,
  teamId: string,
): Promise<ActionResult<{ removed: true }>> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Authentication required" };
  if (!canAccessOperations(actor)) {
    return { success: false, error: "Access denied" };
  }
  try {
    await services.teams.removeMember(userId, teamId);
    return { success: true, data: { removed: true } };
  } catch (err) {
    console.error("Failed to remove team member:", err);
    return { success: false, error: "Failed to remove team member" };
  }
}

export async function setTeamMembershipRole(
  userId: string,
  teamId: string,
  newRole: UserRole,
): Promise<ActionResult<TeamMembership>> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Authentication required" };
  if (!canAccessOperations(actor)) {
    return { success: false, error: "Access denied" };
  }
  const memberships = await services.teams.membershipsForUser(userId);
  const current = memberships.find((m) => m.teamId === teamId);
  if (!current) return { success: false, error: "Membership not found" };
  if (!canSetRole(actor, current.role, newRole)) {
    return { success: false, error: "Access denied" };
  }
  try {
    return {
      success: true,
      data: await services.teams.setMembershipRole(userId, teamId, newRole),
    };
  } catch (err) {
    console.error("Failed to set membership role:", err);
    return { success: false, error: "Failed to set membership role" };
  }
}
