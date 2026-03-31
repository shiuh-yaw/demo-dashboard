import {
  getAuthenticatedUser,
  getUserIdFromPayload,
  clearAllMetadata,
} from "@dynamic-demos/dynamic";
import {
  createResponse,
  createErrorResponse,
  withApiHandler,
} from "@/lib/api-response";

/**
 * POST /api/user/metadata/reset-all
 * Clear all metadata for the current user (for demo reset).
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const POST = withApiHandler(
  "user/metadata/reset-all",
  async (request) => {
    const user = await getAuthenticatedUser(request);
    if (!user) return createErrorResponse("Unauthorized", 401);

    const userId = getUserIdFromPayload(user);
    if (!userId) {
      return createErrorResponse("Invalid token: missing user id", 401);
    }

    await clearAllMetadata(userId);
    return createResponse({ success: true });
  },
);
