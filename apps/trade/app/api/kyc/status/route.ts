import {
  getAuthenticatedUser,
  getUserIdFromPayload,
  getUser,
  isKycCompleted,
} from "@dynamic-demos/dynamic";
import {
  createResponse,
  createErrorResponse,
  withApiHandler,
} from "@/lib/api-response";

/**
 * GET /api/kyc/status
 * Return the current user's KYC approval status from Dynamic metadata.
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const GET = withApiHandler("kyc/status", async (request) => {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) return createErrorResponse("Unauthorized", 401);

  const userId = getUserIdFromPayload(authUser);
  if (!userId) {
    return createErrorResponse("Invalid token: missing user id", 401);
  }

  const user = await getUser(userId);
  const kycApproved = user ? isKycCompleted(user) : false;

  return createResponse({ kycApproved });
});
