/**
 * set-role core logic (testable; no process/env access here). Resolves a user
 * by email, validates the target role, and assigns it - refusing unknown
 * emails (never creates) and invalid roles. Access control for the CLI is
 * possession of DATABASE_URL, enforced in cli.ts.
 */

import type { GtmUserService, UserRole } from "@/lib/services";

export const VALID_ROLES: UserRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

export class InvalidRoleError extends Error {
  constructor(public readonly given: string) {
    super(`Invalid role "${given}". Expected one of: ${VALID_ROLES.join(", ")}`);
    this.name = "InvalidRoleError";
  }
}

export class UnknownUserError extends Error {
  constructor(public readonly email: string) {
    super(`No user with email "${email}" (set-role never creates users)`);
    this.name = "UnknownUserError";
  }
}

export interface SetRoleDeps {
  users: Pick<GtmUserService, "findByEmail" | "setRole">;
  email: string;
  role: string;
  log?: (message: string) => void;
}

export async function runSetRole(
  deps: SetRoleDeps,
): Promise<{ before: UserRole; after: UserRole }> {
  const role = deps.role.trim().toUpperCase() as UserRole;
  if (!VALID_ROLES.includes(role)) throw new InvalidRoleError(deps.role);

  const user = await deps.users.findByEmail(deps.email);
  if (!user) throw new UnknownUserError(deps.email);

  const before = user.role;
  const updated = await deps.users.setRole(user.id, role);
  deps.log?.(`${user.email}: ${before} -> ${updated.role}`);
  return { before, after: updated.role };
}
