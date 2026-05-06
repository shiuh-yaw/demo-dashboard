/**
 * BlindPay webhook receiver — Phase 5A reference wiring (D-011).
 *
 * BlindPay delivers webhooks via Svix; verification + normalization
 * live in `@dynamic-demos/blindpay`. The dashboard adapts those into
 * the framework contract via `blindpay-adapter.ts`, then composes the
 * standard receiver pipeline through `createWebhookHandler`.
 *
 * Per-provider explicit route (D-011) — never a dynamic `[provider]`
 * route. Each provider gets its own raw-body parsing config and IP
 * allowlist; sharing a handler across providers would couple their
 * verifier shapes.
 *
 * Returns 401 with no row written when `BLINDPAY_WEBHOOK_SECRET` is
 * unset. Failing closed is intentional: a misconfigured deployment
 * never silently accepts unsigned webhooks.
 */

import { env } from "@/env";
import {
  transactionRecordService,
  webhookEventService,
} from "@/lib/services";

import {
  blindpayNormalize,
  blindpayVerifySignature,
} from "@/lib/webhooks/blindpay-adapter";
import { createWebhookHandler } from "@/lib/webhooks/handler-factory";
import { getWebhookDedupClient } from "@/lib/webhooks/redis-client";

// Svix signs raw bytes — Next.js App Router exposes them via
// `req.text()`. No body parser config needed in App Router routes
// (only in legacy Pages API), so the framework's `req.text()` call
// is sufficient.

const PROVIDER = "blindpay" as const;

export async function POST(req: Request): Promise<Response> {
  const secret = env.BLINDPAY_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed — never silently accept unsigned webhooks.
    console.error(
      `[security:webhook-signature-failure] provider=${PROVIDER} reason=missing-BLINDPAY_WEBHOOK_SECRET`,
    );
    return new Response("Webhook receiver not configured", { status: 401 });
  }

  const handler = createWebhookHandler({
    provider: PROVIDER,
    secret,
    verifySignature: blindpayVerifySignature,
    normalize: blindpayNormalize,
    webhookEventService,
    transactionRecordService,
    redis: getWebhookDedupClient(),
  });

  return handler(req);
}
