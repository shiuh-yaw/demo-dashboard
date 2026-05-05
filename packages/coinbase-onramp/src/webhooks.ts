/**
 * Coinbase Onramp webhook signature verification + event normalization.
 *
 * Coinbase Developer Platform webhooks sign request bodies with HMAC
 * SHA-256, transmitted via the `X-Webhook-Signature` header (hex). The
 * shared secret is configured per webhook endpoint in the CDP console.
 *
 * Reference: https://docs.cdp.coinbase.com/get-started/docs/webhooks
 *
 * The dashboard's `/api/webhooks/coinbase` route (Phase 5A) is expected
 * to call `verifyCoinbaseOnrampWebhookSignature` against the raw request
 * body before any JSON parsing, then `normalizeCoinbaseOnrampEvent` to
 * translate the payload into a `CanonicalEvent` shape.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  mapCoinbaseOnrampStatus,
  type CanonicalTransactionStatePlaceholder,
  type CoinbaseOnrampOrderStatus,
} from "./state-mapping";

/** Header Coinbase uses for the HMAC-SHA256 signature (hex-encoded). */
export const COINBASE_ONRAMP_SIGNATURE_HEADER = "X-Webhook-Signature";

export interface VerifyCoinbaseOnrampWebhookSignatureInput {
  /** Raw request body bytes — verify BEFORE JSON parsing. */
  rawBody: string | Buffer;
  /** Value of the `X-Webhook-Signature` header (hex). */
  signatureHeader: string | null | undefined;
  /** Shared signing secret configured for this webhook endpoint. */
  secret: string;
}

/**
 * Verify a Coinbase Onramp webhook signature.
 *
 * Returns `true` only when the supplied signature matches an HMAC
 * SHA-256 of `rawBody` using `secret`. Any malformed input (missing
 * header, wrong length, non-hex) returns `false` rather than throwing,
 * so handlers can respond `401` uniformly.
 */
export function verifyCoinbaseOnrampWebhookSignature(
  input: VerifyCoinbaseOnrampWebhookSignatureInput,
): boolean {
  const { rawBody, signatureHeader, secret } = input;
  if (!signatureHeader || !secret) return false;

  // Strip optional `sha256=` prefix some upstream tooling adds.
  const provided = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;

  if (!/^[0-9a-fA-F]+$/.test(provided)) return false;

  const expected = createHmac("sha256", secret)
    .update(typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody)
    .digest();

  let providedBuf: Buffer;
  try {
    providedBuf = Buffer.from(provided, "hex");
  } catch {
    return false;
  }
  if (providedBuf.length !== expected.length) return false;

  return timingSafeEqual(providedBuf, expected);
}

/** Subset of fields the dashboard cares about. Coinbase events vary. */
export interface CoinbaseOnrampWebhookEvent {
  id?: string;
  type?: string;
  data?: {
    orderId?: string;
    status?: CoinbaseOnrampOrderStatus;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface NormalizedCoinbaseOnrampEvent {
  /** Provider event id (when supplied). */
  eventId: string | null;
  /** Provider order id this event refers to. */
  orderId: string | null;
  /** Raw provider status string, lower-cased. */
  providerStatus: string | null;
  /** Mapped canonical state, or `null` when the status is unknown. */
  canonicalState: CanonicalTransactionStatePlaceholder | null;
  /** The original event for downstream consumers. */
  raw: CoinbaseOnrampWebhookEvent;
}

/**
 * Normalize a Coinbase Onramp webhook payload into a provider-agnostic
 * shape the orchestrator can persist.
 */
export function normalizeCoinbaseOnrampEvent(
  event: CoinbaseOnrampWebhookEvent,
): NormalizedCoinbaseOnrampEvent {
  const rawStatus = event?.data?.status;
  const providerStatus =
    typeof rawStatus === "string" ? rawStatus.toLowerCase() : null;

  return {
    eventId: typeof event?.id === "string" ? event.id : null,
    orderId:
      typeof event?.data?.orderId === "string" ? event.data.orderId : null,
    providerStatus,
    canonicalState: providerStatus
      ? mapCoinbaseOnrampStatus(providerStatus as CoinbaseOnrampOrderStatus)
      : null,
    raw: event,
  };
}
