/**
 * Iron Finance webhook signature verification + event normalization.
 *
 * Iron uses the Standard Webhooks specification:
 *   - Header `webhook-signature` with format `v1=<hex>`.
 *   - Header `webhook-timestamp` (epoch seconds).
 *   - Header `webhook-id` (unique event id).
 *   - HMAC-SHA256(key = base64_decode(secret), msg = timestamp + rawBody).
 *   - Secret prefixed with `whsec_` (strip before base64 decode).
 *   - Replay tolerance: 5 minutes.
 *
 * Reference: https://docs.iron.xyz/webhooks
 *
 * Phase 5A (`apps/dashboard/src/app/api/webhooks/iron/...`) wires these into
 * the shared dashboard webhook framework. This file is responsible only for:
 *   1. Verifying the HMAC signature in constant time.
 *   2. Normalizing the JSON body into a `CanonicalEvent` shape.
 *
 * The canonical event shape mirrors what Phase 1E (`@dynamic-demos/transactions`)
 * will publish; this file declares a local placeholder until that lands.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ironAutorampStatusToCanonical,
  ironTransactionStatusToCanonical,
  type CanonicalTransactionState,
} from "./state-mapping";

export const IRON_SIGNATURE_HEADER = "webhook-signature";
export const IRON_TIMESTAMP_HEADER = "webhook-timestamp";
export const IRON_ID_HEADER = "webhook-id";

/** Max clock skew tolerance (5 minutes). */
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

/**
 * Placeholder canonical event shape — replaced by `@dynamic-demos/transactions`
 * in Phase 1E.
 */
export interface CanonicalEvent {
  /** Event id (Iron webhook-id when present, otherwise resource id). */
  id: string;
  /** Event type, e.g. `iron.register_autoramp_status`. */
  type: string;
  /** Resource type — `autoramp`, `transaction`, `customer`, etc. */
  resource: string;
  /** Iron resource id (autoramp id, customer id...). */
  resource_id: string;
  /** Canonical state derived from the provider status. */
  state?: CanonicalTransactionState;
  /** Original provider status string for debugging. */
  provider_status?: string;
  /** Provider name (always `"iron"` here). */
  provider: "iron";
  /** ISO timestamp of the event. */
  occurred_at: string;
  /** Raw provider event for downstream debugging. */
  raw: unknown;
}

// ---------------------------------------------------------------------------
// Webhook payload types — matches Iron's actual WebhookContainer shape.
// Iron sends `{ type, timestamp, data: { customer_id, message: { <Variant>: { ... } } } }`.
// ---------------------------------------------------------------------------

export type IronWebhookEventType =
  | "transaction"
  | "transaction_status"
  | "new_autoramp"
  | "register_autoramp_status"
  | "new_bank_account"
  | "deposit_address_created"
  | "customer_created"
  | "customer_status"
  | "register_fiat_address_status"
  | "identification_status"
  | "ping";

export interface IronWebhookPayload {
  type: string;
  timestamp?: string;
  data?: {
    customer_id?: string;
    message?: Record<string, Record<string, unknown>>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Webhook headers used for verification. Callers must extract these from the
 * incoming HTTP request.
 */
export interface IronWebhookHeaders {
  "webhook-signature"?: string | null;
  "webhook-timestamp"?: string | null;
  "webhook-id"?: string | null;
}

/**
 * Verify an Iron webhook signature per the Standard Webhooks spec.
 *
 * @param rawBody The raw request body as a string or Buffer (do NOT JSON-parse first).
 * @param headers Object with `webhook-signature`, `webhook-timestamp`, and optionally `webhook-id`.
 * @param secret The webhook secret (with or without `whsec_` prefix).
 */
export function verifyIronSignature(
  rawBody: string | Buffer,
  headers: IronWebhookHeaders,
  secret: string,
): boolean {
  const signatureHeader = headers["webhook-signature"];
  const timestamp = headers["webhook-timestamp"];

  if (!signatureHeader || !timestamp || !secret) return false;

  // Validate timestamp to prevent replay attacks.
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  // Strip "v1=" prefix from signature.
  const sigParts = signatureHeader.split(",");
  const v1Sig = sigParts
    .map((s) => s.trim())
    .find((s) => s.startsWith("v1="));
  if (!v1Sig) return false;
  const normalized = v1Sig.slice(3);

  // Decode secret: strip "whsec_" prefix, then base64-decode.
  let secretKey: Buffer;
  try {
    const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    secretKey = Buffer.from(rawSecret, "base64");
  } catch {
    return false;
  }

  // Compute HMAC-SHA256(key=decoded_secret, msg=timestamp + rawBody).
  const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString();
  const signedPayload = `${timestamp}${bodyStr}`;
  const expected = createHmac("sha256", secretKey)
    .update(signedPayload)
    .digest("hex");

  // Constant-time comparison.
  const expectedBuf = Buffer.from(expected, "hex");
  let providedBuf: Buffer;
  try {
    providedBuf = Buffer.from(normalized, "hex");
  } catch {
    return false;
  }
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Extract the resource id and status from an Iron webhook message variant.
 *
 * Iron's `data.message` is a single-key object like:
 *   `{ RegisterAutorampStatus: { id: "...", status: "..." } }`
 *   `{ TransactionStatus: { id: "...", status: "...", transaction_status: "..." } }`
 */
function extractMessageFields(
  message: Record<string, Record<string, unknown>> | undefined,
): { resourceId: string; status?: string } {
  if (!message) return { resourceId: "" };
  const keys = Object.keys(message);
  if (keys.length === 0) return { resourceId: "" };
  const variant = message[keys[0]!]!;
  return {
    resourceId: (variant.id as string) ?? "",
    status:
      (variant.status as string) ??
      (variant.transaction_status as string) ??
      undefined,
  };
}

/**
 * Map Iron webhook event type to a resource category.
 */
function eventTypeToResource(type: string): string {
  if (type.includes("autoramp")) return "autoramp";
  if (type.includes("transaction")) return "transaction";
  if (type.includes("customer")) return "customer";
  if (type.includes("bank_account") || type.includes("fiat_address"))
    return "fiat_address";
  if (type.includes("identification")) return "identification";
  if (type.includes("deposit_address")) return "wallet";
  return "unknown";
}

/**
 * Normalize an Iron webhook payload into a `CanonicalEvent`.
 *
 * Iron's webhook events use flat type names like `register_autoramp_status`,
 * `transaction_status`, `customer_status`, etc. The `data.message` field
 * contains a single-variant object with the resource id and status.
 */
export function normalizeIronEvent(
  payload: IronWebhookPayload,
): CanonicalEvent {
  const type = payload.type ?? "unknown";
  const resource = eventTypeToResource(type);
  const { resourceId, status } = extractMessageFields(payload.data?.message);
  const customerId = payload.data?.customer_id as string | undefined;

  return {
    id: resourceId || customerId || "",
    type: `iron.${type}`,
    resource,
    resource_id: resourceId,
    state: status
      ? resource === "transaction"
        ? ironTransactionStatusToCanonical(status)
        : ironAutorampStatusToCanonical(status)
      : undefined,
    provider_status: status,
    provider: "iron",
    occurred_at: payload.timestamp ?? new Date().toISOString(),
    raw: payload,
  };
}
