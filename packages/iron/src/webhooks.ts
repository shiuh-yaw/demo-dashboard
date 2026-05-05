/**
 * Iron Finance webhook signature verification + event normalization.
 *
 * Iron signs outbound webhooks with HMAC-SHA256 over the raw request body using
 * the secret returned at endpoint registration. The signature ships in the
 * `X-Iron-Signature` header, hex-encoded. (Reference: docs.iron.xyz/webhooks.)
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
  type CanonicalTransactionState,
} from "./state-mapping";

export const IRON_SIGNATURE_HEADER = "x-iron-signature";

/**
 * Placeholder canonical event shape — replaced by `@dynamic-demos/transactions`
 * in Phase 1E.
 */
export interface CanonicalEvent {
  /** Event id (Iron event_id when present, otherwise resource id). */
  id: string;
  /** Event type, e.g. `iron.autoramp.status_changed`. */
  type: string;
  /** Resource type — `onramp`, `offramp`, `kyc`, etc. */
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

/**
 * Iron webhook payload shape (subset of fields we depend on). Iron sends
 * other fields; we keep them on `data` and pass through via `raw`.
 */
export interface IronWebhookPayload {
  id?: string;
  event_id?: string;
  type?: string; // e.g. "autoramp.status_changed"
  created_at?: string;
  data?: {
    id?: string;
    kind?: "Onramp" | "Offramp" | "Swap";
    status?: string;
    customer_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Verify an Iron webhook signature. Uses HMAC-SHA256 over the raw body.
 * Returns `true` only when the provided signature matches.
 *
 * @param rawBody The raw request body as a string or Buffer (do NOT JSON-parse first).
 * @param signatureHeader The value of the `X-Iron-Signature` header.
 * @param secret The webhook secret configured for this endpoint in Iron.
 */
export function verifyIronSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  // Iron may prefix `sha256=`; tolerate both forms.
  const normalized = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;

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
 * Normalize an Iron webhook payload into a `CanonicalEvent`.
 *
 * Iron's webhook events follow `<resource>.<verb>` (`autoramp.status_changed`,
 * `customer.kyc_updated`...). We extract the resource + resource id and map
 * the provider status to canonical state when present.
 */
export function normalizeIronEvent(
  payload: IronWebhookPayload,
): CanonicalEvent {
  const type = payload.type ?? "unknown";
  const resource = type.includes(".") ? type.split(".")[0]! : "unknown";
  const resourceId = payload.data?.id ?? payload.id ?? "";
  const providerStatus = payload.data?.status;

  return {
    id: payload.event_id ?? payload.id ?? resourceId,
    type: `iron.${type}`,
    resource,
    resource_id: resourceId,
    state: providerStatus
      ? ironAutorampStatusToCanonical(providerStatus)
      : undefined,
    provider_status: providerStatus,
    provider: "iron",
    occurred_at: payload.created_at ?? new Date().toISOString(),
    raw: payload,
  };
}
