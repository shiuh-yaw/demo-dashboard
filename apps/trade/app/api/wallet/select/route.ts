import {
  getAuthenticatedUser,
  getUserIdFromPayload,
  setWalletType,
  type WalletType,
} from "@dynamic-demos/dynamic";
import {
  createResponse,
  createErrorResponse,
  withApiHandler,
} from "@/lib/api-response";

const VALID_TYPES: WalletType[] = ["external", "embedded", "fireblocks"];

/**
 * POST /api/wallet/select
 * Store the user's wallet type selection in Dynamic metadata.
 * Body: { type: "external" | "embedded" | "fireblocks" }
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const POST = withApiHandler("wallet/select", async (request) => {
  const user = await getAuthenticatedUser(request);
  if (!user) return createErrorResponse("Unauthorized", 401);

  const userId = getUserIdFromPayload(user);
  if (!userId) {
    return createErrorResponse("Invalid token: missing user id", 401);
  }

  let body: { type?: string };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("Invalid JSON body", 400);
  }

  const type = body.type;
  if (
    typeof type !== "string" ||
    !VALID_TYPES.includes(type as WalletType)
  ) {
    return createErrorResponse(
      `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
      400,
    );
  }

  await setWalletType(userId, type as WalletType);
  return createResponse({ success: true });
});
