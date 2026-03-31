/**
 * Server-side auth helpers for deposit API routes.
 *
 * Uses Dynamic JWT verification (cookie or Bearer token) — throws
 * {@link UnauthorizedError} so the `withApiHandler` wrapper can
 * translate it into a 401 response.
 */

import {
  getAuthenticatedUser,
  getUserIdFromPayload,
} from "@dynamic-demos/dynamic";
import { UnauthorizedError } from "@/lib/errors";

export async function requireUserId(request: Request): Promise<string> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new UnauthorizedError("Unauthorized");
  }
  const userId = getUserIdFromPayload(user);
  if (!userId) {
    throw new UnauthorizedError("Invalid token: missing user id");
  }
  return userId;
}
