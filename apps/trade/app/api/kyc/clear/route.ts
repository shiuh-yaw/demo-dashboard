import {
  getAuthenticatedUser,
  getUserIdFromPayload,
  clearKycCompleted,
} from "@dynamic-demos/dynamic";
import {
  createResponse,
  createErrorResponse,
  withApiHandler,
} from "@/lib/api-response";

/**
 * POST /api/kyc/clear
 * Clear the current user's KYC approval in Dynamic metadata (for demo reset).
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const POST = withApiHandler("kyc/clear", async (request) => {
  const user = await getAuthenticatedUser(request);
  if (!user) return createErrorResponse("Unauthorized", 401);

  const userId = getUserIdFromPayload(user);
  if (!userId) {
    return createErrorResponse("Invalid token: missing user id", 401);
  }

  await clearKycCompleted(userId);
  return createResponse({ success: true });
});
