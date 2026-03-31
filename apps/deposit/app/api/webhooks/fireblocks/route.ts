import { env } from "@/lib/env";
import { verifyIncomingFireblocksWebhook } from "@dynamic-demos/fireblocks";
import { readFireblocksWebhookNotification } from "@/lib/webhooks/fireblocks/read-notification";
import { routeFireblocksWebhookByEventType } from "@/lib/webhooks/fireblocks/route-by-event-type";
import {
  webhookInvalidSignature,
  webhookProcessingError,
} from "@/lib/webhooks/fireblocks/respond";

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const verified = await verifyIncomingFireblocksWebhook(
      body,
      request.headers,
      {
        jwksUrl: env.FIREBLOCKS_WEBHOOK_JWKS_URL,
        fireblocksApiBaseUrl: env.FIREBLOCKS_API_BASE_URL,
        legacyPublicKeyPem: env.FIREBLOCKS_WEBHOOK_PUBLIC_KEY,
      },
    );

    if (!verified) {
      console.error("[webhook/fireblocks] Invalid signature");
      return webhookInvalidSignature();
    }

    console.log("[webhook/fireblocks] Signature verified");

    const read = readFireblocksWebhookNotification(body);
    if (!read.ok) return read.response;

    console.log("[webhook/fireblocks] Notification", {
      id: read.notification.id,
      eventType: read.notification.eventType ?? read.notification.type,
      resourceId: read.notification.resourceId,
    });

    return await routeFireblocksWebhookByEventType(read.notification);
  } catch (error) {
    console.error("[webhook/fireblocks]", error);
    return webhookProcessingError();
  }
}
