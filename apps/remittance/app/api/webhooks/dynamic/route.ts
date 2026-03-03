import { createResponse, handleApiError } from "@/lib/api-response";
import { handleDynamicWebhook } from "../../handlers/webhooks";

/**
 * Dynamic webhook handler
 * Receives events from Dynamic (user created, wallet created, etc.)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await handleDynamicWebhook(body);
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "webhooks/dynamic");
  }
}
