import {
  getAuthenticatedUser,
  getUserIdFromPayload,
  getUser,
  getUserWallets,
} from "@dynamic-demos/dynamic";
import {
  createResponse,
  createErrorResponse,
  withApiHandler,
} from "@/lib/api-response";

/**
 * GET /api/user/metadata
 * Return the current user's Dynamic metadata.
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const GET = withApiHandler("user/metadata", async (request) => {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) return createErrorResponse("Unauthorized", 401);

  const userId = getUserIdFromPayload(authUser);
  if (!userId) {
    return createErrorResponse("Invalid token: missing user id", 401);
  }

  const [user, wallets] = await Promise.all([
    getUser(userId),
    getUserWallets(userId),
  ]);
  const metadata = user?.metadata ?? {};

  return createResponse({ metadata, userId, wallets });
});
