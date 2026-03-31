import type { FireblocksWebhookNotification } from "@dynamic-demos/fireblocks";
import { normalizeFireblocksEventType } from "@dynamic-demos/fireblocks";
import { webhookAck } from "./respond";
import { handleTransactionStatusUpdated } from "./handlers/transaction-status-updated";
import type { NextResponse } from "next/server";

/**
 * Route a parsed Fireblocks webhook notification to a product-specific handler
 * by normalized event type (e.g. `transaction.status.updated`).
 *
 * @see https://developers.fireblocks.com/reference/webhooks-structures-eventtypes
 */
export async function routeFireblocksWebhookByEventType(
  notification: FireblocksWebhookNotification,
): Promise<NextResponse> {
  const eventKey = normalizeFireblocksEventType(notification);
  console.log("[webhook/fireblocks] Route", { eventKey });

  switch (eventKey) {
    case "transaction.status.updated":
      return handleTransactionStatusUpdated(notification);
    default:
      console.log("[webhook/fireblocks] No handler for event; ACK only");
      return webhookAck();
  }
}
