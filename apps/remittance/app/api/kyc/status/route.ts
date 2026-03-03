import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId } from "../../handlers";
import { handleGetKycStatus } from "../../handlers/kyc";

/**
 * GET /api/kyc/status
 * Return the current user's KYC approval status from Dynamic metadata.
 * Requires Bearer token or dynamic_jwt cookie.
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleGetKycStatus(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "kyc/status");
  }
}
