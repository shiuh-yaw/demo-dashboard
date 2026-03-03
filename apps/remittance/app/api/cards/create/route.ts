import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId } from "../../handlers";
import { handleCreateStubCard } from "../../handlers/cards";

/**
 * POST /api/cards/create
 * Create a stub stablecoin debit card for the authenticated user.
 * Stores card number and expiry in Dynamic user metadata.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleCreateStubCard(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "cards/create");
  }
}
