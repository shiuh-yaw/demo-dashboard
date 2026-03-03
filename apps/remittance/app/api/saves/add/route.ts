import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId, handleAddSaveDeposit } from "../../handlers";

/**
 * POST /api/saves/add
 * Add a save deposit amount to the user's metadata (additive only).
 * Body: { amount: number }
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = await request.json();
    const result = await handleAddSaveDeposit(userId, body);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "saves/add");
  }
}
