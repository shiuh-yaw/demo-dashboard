/**
 * Auth helpers for API handlers
 */

import { getAuthenticatedUser } from "@dynamic-demos/dynamic";
import { UnauthorizedError } from "@/lib/errors";

/**
 * Require authenticated user from request.
 * Returns userId or throws UnauthorizedError.
 */
export async function requireUserId(request: Request): Promise<string> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new UnauthorizedError("Unauthorized");
  }
  const userId = user.sub ?? user.userId;
  if (!userId) {
    throw new UnauthorizedError("Invalid token: missing user id");
  }
  return userId;
}
