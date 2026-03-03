import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId } from "../../handlers";
import { handleSubmitBankDetails } from "../../handlers/withdraw";

/**
 * POST /api/withdraw/bank-submit
 * Mark that the user has submitted bank details. Sets metadata flag only.
 * Requires Bearer token or dynamic_jwt cookie.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = await request.json();
    const result = await handleSubmitBankDetails(userId, body);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "withdraw/bank-submit");
  }
}
