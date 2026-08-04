"use client";

/**
 * `<AuthenticatedMilestone user={user} />` - thin component wrapper over
 * `useAuthenticatedMilestone` for apps that prefer a mounted component (e.g.
 * an always-mounted analytics bridge in a root layout) over calling the hook
 * directly. Renders nothing.
 */

import { useAuthenticatedMilestone } from "./use-authenticated-milestone";
import type { DynamicIdentityUser } from "./identity";

export interface AuthenticatedMilestoneProps {
  user: DynamicIdentityUser | null | undefined;
}

export function AuthenticatedMilestone({
  user,
}: AuthenticatedMilestoneProps): null {
  useAuthenticatedMilestone(user);
  return null;
}
