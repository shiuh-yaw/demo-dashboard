import { createResponse, handleApiError } from "@/lib/api-response";
import {
  requireUserId,
  handleGetRecipients,
  handleAddRecipient,
  handleClearRecipients,
  handleRemoveRecipient,
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
 * With a JSON body ({ email }): remove that one recipient.
 * Without a body: clear all known recipients.
 */
export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = await request.json().catch(() => null);
    const result =
      body && typeof body === "object" && "email" in body
        ? await handleRemoveRecipient(userId, body)
        : await handleClearRecipients(userId);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "recipients/delete");
  }
}
