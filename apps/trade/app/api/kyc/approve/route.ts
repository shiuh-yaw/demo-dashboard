import {
  getAuthenticatedUser,
  getUserIdFromPayload,
  setKycCompleted,
} from "@dynamic-demos/dynamic";
import {
  createResponse,
  createErrorResponse,
  withApiHandler,
} from "@/lib/api-response";

/**
 * POST /api/kyc/approve
 * Mark the current user's KYC as approved in Dynamic metadata.
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const POST = withApiHandler("kyc/approve", async (request) => {
  const user = await getAuthenticatedUser(request);
  if (!user) return createErrorResponse("Unauthorized", 401);

  const userId = getUserIdFromPayload(user);
  if (!userId) {
    return createErrorResponse("Invalid token: missing user id", 401);
  }

  await setKycCompleted(userId);
  return createResponse({ success: true });
});
