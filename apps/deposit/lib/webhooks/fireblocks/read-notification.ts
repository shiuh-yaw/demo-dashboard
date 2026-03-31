/**
 * Safely parses raw Fireblocks webhook POST bodies and validates against the
 * notification Zod schema.  Invalid payloads are ACK'd with 200 to prevent
 * Fireblocks retry storms — the handler logs a warning instead.
 */

import type { NextResponse } from "next/server";
import {
  fireblocksWebhookNotificationSchema,
  type FireblocksWebhookNotification,
} from "@dynamic-demos/fireblocks";
import { webhookAck } from "./respond";

export type ReadFireblocksWebhookNotificationResult =
  | { ok: true; notification: FireblocksWebhookNotification }
  | { ok: false; response: NextResponse };

/**
 * Parses the raw POST body, logs parse/schema failures, and returns `webhookAck()` when invalid
 * so the route stays thin.
 */
export function readFireblocksWebhookNotification(
  bodyText: string,
): ReadFireblocksWebhookNotificationResult {
  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    console.warn("[webhook/fireblocks] Invalid JSON body");
    return { ok: false, response: webhookAck() };
  }

  const parsed = fireblocksWebhookNotificationSchema.safeParse(json);
  if (!parsed.success) {
    console.warn(
      "[webhook/fireblocks] Invalid notification",
      parsed.error.flatten(),
    );
    return { ok: false, response: webhookAck() };
  }

  return { ok: true, notification: parsed.data };
}
