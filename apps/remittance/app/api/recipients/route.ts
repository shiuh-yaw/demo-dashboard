import { createResponse, handleApiError } from "@/lib/api-response";
import {
  requireUserId,
  handleGetRecipients,
  handleAddRecipient,
  handleClearRecipients,
} from "../handlers";

/**
 * GET /api/recipients
 * List known recipient emails for the authenticated user.
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleGetRecipients(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "recipients/list");
  }
}

/**
 * POST /api/recipients
 * Add a new recipient by email. Validates, normalizes, and dedupes.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = await request.json();
    const result = await handleAddRecipient(userId, body);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "recipients/add");
  }
}

/**
 * DELETE /api/recipients
 * Clear all known recipients.
 */
export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await handleClearRecipients(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "recipients/clear");
  }
}
