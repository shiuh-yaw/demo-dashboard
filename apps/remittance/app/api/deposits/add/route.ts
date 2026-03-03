import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId, handleAddDeposit } from "../../handlers";

/**
 * POST /api/deposits/add
 * Add a deposit amount to the user's card balance (stored in metadata).
 * Body: { amount: number }
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = await request.json();
    const result = await handleAddDeposit(userId, body);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "deposits/add");
  }
}
