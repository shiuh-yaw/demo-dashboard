import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId } from "../../handlers";
import { handleClearKyc } from "../../handlers/kyc";

/**
 * POST /api/kyc/clear
 * Clear the current user's KYC approval in Dynamic metadata.
 * Requires Bearer token or dynamic_jwt cookie.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleClearKyc(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "kyc/clear");
  }
}
