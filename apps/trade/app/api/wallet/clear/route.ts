import {
  getAuthenticatedUser,
  getUserIdFromPayload,
  clearWalletType,
} from "@dynamic-demos/dynamic";
import {
  createResponse,
  createErrorResponse,
  withApiHandler,
} from "@/lib/api-response";

/**
 * POST /api/wallet/clear
 * Clear the user's wallet type selection in Dynamic metadata.
 * User will see the wallet selection screen again on next load.
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const POST = withApiHandler("wallet/clear", async (request) => {
  const user = await getAuthenticatedUser(request);
  if (!user) return createErrorResponse("Unauthorized", 401);

  const userId = getUserIdFromPayload(user);
  if (!userId) {
    return createErrorResponse("Invalid token: missing user id", 401);
  }

  await clearWalletType(userId);
  return createResponse({ success: true });
});
