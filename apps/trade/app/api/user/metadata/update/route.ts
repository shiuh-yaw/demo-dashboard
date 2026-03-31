import {
  getAuthenticatedUser,
  getUserIdFromPayload,
  updateUserMetadata,
} from "@dynamic-demos/dynamic";
import {
  createResponse,
  createErrorResponse,
  withApiHandler,
} from "@/lib/api-response";

/**
 * POST /api/user/metadata/update
 * Merge metadata into the current user's Dynamic metadata.
 * Body: { metadata: Record<string, unknown> }
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const POST = withApiHandler("user/metadata/update", async (request) => {
  const user = await getAuthenticatedUser(request);
  if (!user) return createErrorResponse("Unauthorized", 401);

  const userId = getUserIdFromPayload(user);
  if (!userId) {
    return createErrorResponse("Invalid token: missing user id", 401);
  }

  let body: { metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("Invalid JSON body", 400);
  }

  const metadata = body.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return createErrorResponse("metadata must be an object", 400);
  }

  await updateUserMetadata(userId, metadata);
  return createResponse({ success: true });
});
