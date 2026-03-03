import { createResponse, handleApiError } from "@/lib/api-response";
import { requireUserId, handleResolveRecipient } from "../../handlers";

/**
 * POST /api/recipients/resolve
 * Resolve email to wallet address via Dynamic pre-gen.
 * Returns address for use in send flow; client must not display it.
 */
export async function POST(request: Request) {
  try {
    await requireUserId(request);
    const body = await request.json();
    const result = await handleResolveRecipient(body);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "recipients/resolve");
  }
}
