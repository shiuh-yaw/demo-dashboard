import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { env } from "@/lib/env";
import {
  isDelegationEvent,
  processDelegationWebhook,
  type DelegationEvent,
} from "@/lib/delegation/webhook";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Dynamic webhook payload structure
 * @see https://dynamic.xyz/docs/developer-dashboard/webhooks/events
 */
interface DynamicWebhookPayload {
  messageId: string;
  eventId: string;
  /** Event type (e.g. "wallet.delegation.created"). */
  eventName: string;
  timestamp: string;
  webhookId: string;
  userId?: string;
  environmentId: string;
  environmentName: string;
  redelivery?: boolean;
  data: Record<string, unknown>;
}

// =============================================================================
// SIGNATURE VERIFICATION
// =============================================================================

/**
 * HMAC-SHA256 over the RAW request body, compared against
 * `x-dynamic-signature-256: sha256=<hex>`.
 *
 * Must be the raw bytes: re-serializing the parsed JSON changes key order and
 * whitespace, so the digest would never match.
 */
function verifySignature({
  secret,
  signature,
  rawBody,
}: {
  secret: string;
  signature: string;
  rawBody: string;
}): boolean {
  try {
    const digest = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");
    const expected = Buffer.from(`sha256=${digest}`, "ascii");
    const received = Buffer.from(signature, "ascii");
    // timingSafeEqual throws on length mismatch, so check first.
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

/**
 * POST /api/webhooks/dynamic
 *
 * Receives Dynamic webhooks for this app. Delegated access
 * (`wallet.delegation.created` / `.revoked`) is handled here rather than in the
 * dashboard: the app the user delegates TO is the app that holds the share.
 *
 * Fails closed when `DYNAMIC_WEBHOOK_SECRET` is unset - an endpoint that
 * accepts unsigned deliveries is worse than one that rejects everything.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const webhookSecret = env.DYNAMIC_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(
        "[security:webhook-signature-failure] reason=missing-DYNAMIC_WEBHOOK_SECRET",
      );
      return NextResponse.json(
        { error: "Webhook receiver not configured" },
        { status: 401 },
      );
    }

    // Dynamic sends `-256`; the bare header is the legacy spelling.
    const signature =
      request.headers.get("x-dynamic-signature-256") ??
      request.headers.get("x-dynamic-signature");
    if (!signature) {
      console.error(
        "[security:webhook-signature-failure] reason=missing-signature-header",
      );
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    if (!verifySignature({ secret: webhookSecret, signature, rawBody })) {
      console.error(
        "[security:webhook-signature-failure] reason=invalid-signature",
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: DynamicWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as DynamicWebhookPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("[Webhook] Event received:", {
      eventName: payload.eventName,
      eventId: payload.eventId,
      userId: payload.userId,
      environmentName: payload.environmentName,
    });

    if (isDelegationEvent(payload.eventName)) {
      try {
        const outcome = await processDelegationWebhook(
          payload as unknown as DelegationEvent,
          {
            rsaPrivateKey: env.DELEGATION_RSA_PRIVATE_KEY,
            encryptionKey: env.DELEGATION_ENC_KEY,
            logger: { info: (line) => console.log(line) },
          },
        );
        console.log(
          `[Webhook] delegation outcome=${outcome.kind}${
            outcome.kind === "skipped" ? ` reason=${outcome.reason}` : ""
          }`,
        );
      } catch (error) {
        // Ack rather than have Dynamic retry a decrypt that fails
        // deterministically. Never let material escape in the message.
        console.error(
          "[Webhook] delegation-processing-failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/webhooks/dynamic
 *
 * Health check - useful for confirming a tunnel reaches this app.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Dynamic webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
