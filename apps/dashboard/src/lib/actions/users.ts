"use server";

/**
 * User role administration. Server-side only; no UI (Phase 07). Every mutation
 * re-checks the actor's session and the canSetRole matrix - only an OWNER may
 * touch an OWNER/ADMIN; an ADMIN may only move a target between MEMBER and
 * VIEWER. The first OWNER is bootstrapped by the set-role CLI, never here.
 */

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/gtm";
import { canSetRole } from "@/lib/auth/policy";
import { services } from "@/lib/services";
import type { GtmUser, UserRole } from "@/lib/services";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Assign `newRole` to another user, gated by the canSetRole matrix. */
export async function setUserRole(
  targetUserId: string,
  newRole: UserRole,
): Promise<ActionResult<GtmUser>> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Authentication required" };

  const target = await services.users.get(targetUserId);
  if (!target) return { success: false, error: "User not found" };

  if (!canSetRole(actor, target.role, newRole)) {
    return { success: false, error: "Access denied" };
  }

  try {
    const updated = await services.users.setRole(targetUserId, newRole);
    // Purge the server cache for the admin surface so the new role reflects.
    revalidatePath("/dashboard/operations");
    return { success: true, data: updated };
  } catch (err) {
    console.error("Failed to set user role:", err);
    return { success: false, error: "Failed to set user role" };
  }
}
