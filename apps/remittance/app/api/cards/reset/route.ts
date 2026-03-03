import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId } from "../../handlers";
import { handleResetStubCard } from "../../handlers/cards";

/**
 * POST /api/cards/reset
 * Remove stub stablecoin debit card metadata for the authenticated user.
 * User can create a new card afterward.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleResetStubCard(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "cards/reset");
  }
}
