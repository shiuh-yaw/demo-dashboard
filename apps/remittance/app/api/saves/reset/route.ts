import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId, handleResetSaveDeposits } from "../../handlers";

/**
 * POST /api/saves/reset
 * Reset save deposits to 0.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleResetSaveDeposits(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "saves/reset");
  }
}
