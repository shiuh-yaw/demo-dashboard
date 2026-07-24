"use server";

/**
 * Team + membership administration. Server-side only; no UI (Phase 07).
 * Admin-gated: the actor must be a global ADMIN+ (canAccessOperations).
 * Grantable/settable membership roles are bounded by the canSetRole matrix
 * (an ADMIN may only assign MEMBER/VIEWER). Team-lead self-management for
 * non-global-admins is deferred to Phase 07.
 */

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/gtm";
import { canAccessOperations, canSetRole } from "@/lib/auth/policy";
import { services } from "@/lib/services";
import type { Page, PageOptions, Team, TeamMembership, UserRole } from "@/lib/services";
import type { AdminUserView, TeamMemberView } from "./team-views";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Admin-gated: one cursor page of teams, newest-created first. Omit
 * `options`/`cursor` for the first page; pass the previous page's
 * `nextCursor` to fetch the next one (drives the operations-page infinite
 * scroll - see `teams-admin.tsx`).
 */
export async function listTeams(
  options?: PageOptions,
): Promise<ActionResult<Page<Team>>> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Authentication required" };
  if (!canAccessOperations(actor)) return { success: false, error: "Access denied" };
  const page = await services.teams.list(options);
  return { success: true, data: page };
}

/**
 * Admin-gated: one cursor page of workspace users (for member pickers + role
 * admin). Same cursor contract as `listTeams`.
 */
export async function listWorkspaceUsers(
  options?: PageOptions,
): Promise<ActionResult<Page<AdminUserView>>> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Authentication required" };
  if (!canAccessOperations(actor)) return { success: false, error: "Access denied" };
  const page = await services.users.list(options);
  return {
    success: true,
    data: {
      items: page.items.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
      })),
      nextCursor: page.nextCursor,
    },
  };
}

/** Admin-gated: a team's members resolved to identities. */
export async function listTeamMembers(
  teamId: string,
): Promise<ActionResult<TeamMemberView[]>> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Authentication required" };
  if (!canAccessOperations(actor)) return { success: false, error: "Access denied" };
  const memberships = await services.teams.membershipsForTeam(teamId);
  const views = await Promise.all(
    memberships.map(async (m) => {
      const u = await services.users.get(m.userId);
      return {
        userId: m.userId,
        teamId: m.teamId,
        role: m.role,
        email: u?.email ?? m.userId,
        displayName: u?.displayName ?? null,
      };
    }),
  );
  return { success: true, data: views };
}

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
    const team = await services.teams.create({ name, slug });
    // New team must reach the switcher live, not just this admin page.
    revalidatePath("/", "layout");
    return { success: true, data: team };
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
    const membership = await services.teams.addMember(userId, teamId, role);
    // The added user's switcher and this page's member count both read stale
    // otherwise until a hard reload.
    revalidatePath("/", "layout");
    return { success: true, data: membership };
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
    // Same live-refresh need as addMember - the removed user's switcher and
    // this page's member count both read stale otherwise.
    revalidatePath("/", "layout");
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
