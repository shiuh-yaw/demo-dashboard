import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId } from "../../handlers";
import { handleGetBankStatus } from "../../handlers/withdraw";

/**
 * GET /api/withdraw/bank-status
 * Return whether the current user has submitted bank details (from Dynamic metadata).
 * Requires Bearer token or dynamic_jwt cookie.
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleGetBankStatus(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "withdraw/bank-status");
  }
}
