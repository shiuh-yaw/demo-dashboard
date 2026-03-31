import {
  getAuthenticatedUser,
  getUserIdFromPayload,
  removeMetadataKey,
} from "@dynamic-demos/dynamic";
import {
  createResponse,
  createErrorResponse,
  withApiHandler,
} from "@/lib/api-response";

/**
 * POST /api/user/metadata/reset
 * Remove a metadata key for the current user.
 * Body: { key: string }
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const POST = withApiHandler(
  "user/metadata/reset",
  async (request) => {
    const user = await getAuthenticatedUser(request);
    if (!user) return createErrorResponse("Unauthorized", 401);

    const userId = getUserIdFromPayload(user);
    if (!userId) {
      return createErrorResponse("Invalid token: missing user id", 401);
    }

    const body = await request.json().catch(() => ({}));
    const key = typeof body.key === "string" ? body.key.trim() : null;
    if (!key) {
      return createErrorResponse("Missing or invalid key", 400);
    }

    await removeMetadataKey(userId, key);
    return createResponse({ success: true });
  },
);
