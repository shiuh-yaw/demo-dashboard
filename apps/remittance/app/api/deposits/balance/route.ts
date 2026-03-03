import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId, handleGetCardBalance } from "../../handlers";

/**
 * GET /api/deposits/balance
 * Get current card balance (total deposits) for the authenticated user.
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleGetCardBalance(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "deposits/balance");
  }
}
