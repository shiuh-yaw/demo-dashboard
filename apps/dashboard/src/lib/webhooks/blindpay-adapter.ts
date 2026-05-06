/**
 * BlindPay → framework adapter for the dashboard webhook receiver.
 *
 * Translates between the package-side webhook surface
 * (`@dynamic-demos/blindpay/webhooks`) and the framework's `Request`-
 * shaped callbacks. Lives in the dashboard rather than in the BlindPay
 * package because the framework contract is a dashboard concern (D-011).
 *
 * Why this exists at all: each provider has a different signature
 * scheme + header naming, but the framework speaks one shape. Keeping
 * the per-provider quirk-tolerance (svix headers, status mapping
 * defensiveness) here means new providers don't have to mutate the
 * framework.
 */

import { TransactionState } from "@dynamic-demos/transactions";
import {
  webhooks as blindpayWebhooks,
  type BlindpayWebhookHeaders,
  type BlindpayWebhookPayload,
} from "@dynamic-demos/blindpay";

import type { CanonicalWebhookEvent } from "./types";

interface VerifyArgs {
  body: string;
  headers: Headers;
  secret: string;
}

/**
 * Read the three svix headers off a Web `Headers` object. Throws when
 * any are missing — the framework catches and returns 401.
 */
function readSvixHeaders(headers: Headers): BlindpayWebhookHeaders {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    throw new Error(
      "BlindPay webhook missing required svix headers (svix-id, svix-timestamp, svix-signature).",
    );
  }
  return { id, timestamp, signature };
}

export function blindpayVerifySignature({
  body,
  headers,
  secret,
}: VerifyArgs): void {
  const svix = readSvixHeaders(headers);
  blindpayWebhooks.verifySignature({
    body,
    headers: svix,
    secret,
  });
}

interface NormalizeArgs {
  body: unknown;
  headers: Headers;
}

/**
 * `mapBlindpayStatus` returns one of the placeholder enum values from
 * the package; those literal strings equal `TransactionState` values,
 * so we narrow them here without branching. Unknown / non-canonical
 * statuses surface as `null` so the framework persists the row but
 * skips state transitions.
 */
function toCanonicalState(
  v: string | null,
): TransactionState | null {
  if (!v) return null;
  // Keys of TransactionState are the same strings as values.
  if (Object.values(TransactionState).includes(v as TransactionState)) {
    return v as TransactionState;
  }
  return null;
}

export function blindpayNormalize({
  body,
  headers,
}: NormalizeArgs): CanonicalWebhookEvent {
  const svix = readSvixHeaders(headers);
  const payload = (body ?? {}) as BlindpayWebhookPayload;
  const canonical = blindpayWebhooks.normalize(payload, svix);

  return {
    providerEventId: canonical.messageId,
    eventType: canonical.type,
    occurredAt: new Date(canonical.timestamp * 1000),
    rawPayload: body,
    normalizedPayload: canonical,
    resourceId: canonical.resourceId,
    // Phase 5A leaves transaction resolution as a separate concern —
    // the upstream `data.id` (BlindPay's payout/payin id) is not the
    // dashboard's local TransactionRecord id, and there's no resolver
    // wired yet. Events without a match persist as `ignored`.
    transactionId: null,
    canonicalState: toCanonicalState(
      canonical.canonicalState as string | null,
    ),
  };
}
