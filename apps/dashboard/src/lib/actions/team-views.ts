/**
 * Serializable view shapes returned by the team admin actions. Kept out of the
 * "use server" module (which may only export async functions).
 */

import type { UserRole } from "@/lib/services";

/** Workspace user for admin pickers + role admin. */
export interface AdminUserView {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  /** True when excluded from the active workspace but still shown (e.g. the current prospect owner). Absent where not tracked. */
  deactivated?: boolean;
}

/** A team's member with its per-team role and resolved identity. */
export interface TeamMemberView {
  userId: string;
  teamId: string;
  role: UserRole;
  email: string;
  displayName: string | null;
}
