import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId, handleResetCardDeposits } from "../../handlers";

/**
 * POST /api/deposits/reset
 * Reset card balance (deposits) to 0.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleResetCardDeposits(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "deposits/reset");
  }
}
