/**
 * Dynamic webhook receiver — Phase 7 magic-send (D-011).
 *
 * Dynamic delivers `wallet.activity` events (and others) over a single
 * webhook endpoint per environment. The signature scheme is HMAC-SHA256
 * over the raw body, hex-encoded, in `x-dynamic-signature-256:
 * sha256=<hex>`. The shared receiver framework
 * (`lib/webhooks/handler-factory.ts`) does signature verification +
 * dedup + persistence; this route plugs the Dynamic-specific
 * verifier/normalizer and adds a post-persist hook that routes
 * `wallet.activity` events to the magic-send processor.
 *
 * Returns 401 when `DYNAMIC_WEBHOOK_SECRET` is unset — failing closed
 * is intentional (D-005).
 */

import { env } from "@/env";
import { transactionRecordService, webhookEventService } from "@/lib/services";

import { createWebhookHandler } from "@/lib/webhooks/handler-factory";
import { getWebhookDedupClient } from "@/lib/webhooks/redis-client";
import type {
  CanonicalWebhookEvent,
  WebhookLogger,
} from "@/lib/webhooks/types";

import {
  getMagicSendIntentService,
  getMagicSendRedisClient,
} from "../../magic-send/_shared";

import {
  normalizeDynamicWalletActivity,
  processDynamicWalletActivityWebhook,
  verifyDynamicWebhookSignature,
  type DynamicWalletActivityEvent,
} from "@/lib/services/magic-send";

const PROVIDER = "dynamic" as const;

const DEFAULT_LOGGER: WebhookLogger = {
  info: (line) => console.info(line),
  error: (line, err) => {
    if (err !== undefined) console.error(line, err);
    else console.error(line);
  },
};

/**
 * Dynamic verifier wired for the framework signature.
 */
function dynamicVerifySignature({
  body,
  headers,
  secret,
}: {
  body: string;
  headers: Headers;
  secret: string;
}): void {
  const signature = headers.get("x-dynamic-signature-256");
  if (!signature) {
    throw new Error("Missing x-dynamic-signature-256 header");
  }
  const ok = verifyDynamicWebhookSignature({
    secret,
    signature,
    rawBody: body,
  });
  if (!ok) {
    throw new Error("Invalid Dynamic webhook signature");
  }
}

export async function POST(req: Request): Promise<Response> {
  const secret = env.DYNAMIC_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      `[security:webhook-signature-failure] provider=${PROVIDER} reason=missing-DYNAMIC_WEBHOOK_SECRET`,
    );
    return new Response("Webhook receiver not configured", { status: 401 });
  }

  // Two-step pipeline. The shared factory handles steps 1-6 (verify,
  // parse, normalize, dedup, persist event row). After it returns we
  // route `wallet.activity` events through the magic-send processor.
  // We accomplish this by intercepting the framework's `normalize` to
  // capture the parsed body, then doing magic-send routing after the
  // handler returns (it's safer to do this in two phases — the
  // framework already owns the dedup + persist contract).

  // We need the parsed body for post-persist routing; clone the
  // request so we can re-read it after the framework consumes it.
  // Web `Request` bodies are one-shot streams, so we capture the text
  // before calling into the framework.
  const rawBody = await req.text();

  // The signature must be verified against the same bytes the
  // framework will read. We pass a synthetic request carrying the same
  // body back to the framework.
  let parsed: unknown;
  try {
    parsed = rawBody.length === 0 ? {} : JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  let normalized: CanonicalWebhookEvent | null = null;

  const handler = createWebhookHandler({
    provider: PROVIDER,
    secret,
    verifySignature: dynamicVerifySignature,
    normalize: (input) => {
      const result = normalizeDynamicWalletActivity(input);
      normalized = result;
      return result;
    },
    webhookEventService,
    transactionRecordService,
    redis: getWebhookDedupClient(),
  });

  const synthetic = new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: rawBody,
  });
  const frameworkResponse = await handler(synthetic);

  // If the framework rejected (401/400/429/500), don't run magic-send
  // routing — there's no event row and no work to do.
  if (!frameworkResponse.ok) {
    return frameworkResponse;
  }

  // Only route `wallet.activity` events through the magic-send
  // processor. Anything else is left as `processed` by the framework.
  if (normalized && (normalized as CanonicalWebhookEvent).eventType === "wallet.activity") {
    try {
      const event = parsed as DynamicWalletActivityEvent;
      const outcome = await processDynamicWalletActivityWebhook(event, {
        redis: getMagicSendRedisClient(),
        intents: getMagicSendIntentService(),
        logger: DEFAULT_LOGGER,
      });
      DEFAULT_LOGGER.info(
        `[webhook:${PROVIDER}] magic-send outcome=${outcome.kind} ${
          outcome.kind === "executed"
            ? `intentId=${outcome.intentId}`
            : outcome.kind === "no-match"
              ? `recipient=${outcome.recipient}`
              : `reason=${outcome.reason}`
        }`,
      );
    } catch (err) {
      // The event row is already persisted; magic-send routing
      // failure shouldn't keep Dynamic retrying. Log and ack.
      DEFAULT_LOGGER.error(
        `[webhook:${PROVIDER}] magic-send-routing-failed`,
        err,
      );
    }
  }

  return frameworkResponse;
}
