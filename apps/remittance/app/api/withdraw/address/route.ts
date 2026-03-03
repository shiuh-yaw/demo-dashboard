import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId } from "../../handlers";
import { handleGetWithdrawAddress } from "../../handlers/withdraw";

/**
 * Returns the vault deposit address for the authenticated user.
 * Uses Dynamic user ID as the vault identifier.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleGetWithdrawAddress(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "withdraw/address");
  }
}
