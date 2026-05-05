/**
 * BlindPay webhook signature verification + event normalization.
 *
 * BlindPay uses Svix to deliver webhooks. The signature scheme follows
 * Svix's convention:
 *
 *   - `svix-id` — message id
 *   - `svix-timestamp` — unix seconds (string)
 *   - `svix-signature` — space-separated list of `v1,<base64>` pairs; the
 *     signature is HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${body}`
 *     with the secret as key. The secret BlindPay issues is prefixed with
 *     `whsec_` and base64-encoded.
 *
 * Reference: https://www.blindpay.com/docs/essentials/webhooks
 *
 * **Phase 5A wires the actual webhook routes; this module ships the
 * verifier + normalizer only.**
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import type { BlindpayStatus } from "./state-mapping";
import {
  mapBlindpayStatus,
  type CanonicalTransactionStatePlaceholder,
} from "./state-mapping";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlindpayWebhookHeaders {
  /** `svix-id` */
  id: string;
  /** `svix-timestamp` (unix seconds, as string). */
  timestamp: string;
  /** `svix-signature` — `"v1,<base64> v1,<base64>"`. */
  signature: string;
}

export interface VerifySignatureInput {
  /** Raw request body (bytes or pre-decoded UTF-8 string). */
  body: string;
  headers: BlindpayWebhookHeaders;
  /** Webhook secret (Svix `whsec_<base64>` form, or already-decoded bytes). */
  secret: string | Uint8Array;
  /**
   * Allowed timestamp drift in seconds. Defaults to 300s (5 minutes) — the
   * Svix recommended window. Pass `Infinity` to disable timestamp checks
   * (only do this in tests).
   */
  toleranceSeconds?: number;
  /** Override "now" in seconds for deterministic tests. */
  nowSeconds?: number;
}

export type CanonicalEventKind =
  | "payin"
  | "payout"
  | "transfer"
  | "wallet.inbound"
  | "receiver"
  | "bankAccount"
  | "unknown";

export interface CanonicalEvent {
  /** Provider event type, verbatim (e.g. `payin.complete`). */
  type: string;
  /** Coarse-grained classification used by routing logic. */
  kind: CanonicalEventKind;
  /** Provider-issued message id (`svix-id`). */
  messageId: string;
  /** Timestamp in unix seconds (parsed from `svix-timestamp`). */
  timestamp: number;
  /**
   * Canonical state mapped from the event payload's `status` field, when
   * one is present and the event is transaction-shaped. `null` for non-
   * transaction events (e.g. `receiver.new`).
   */
  canonicalState: CanonicalTransactionStatePlaceholder | null;
  /** Provider-side resource id when the event payload exposes one. */
  resourceId: string | null;
  /** Original parsed payload, untouched. */
  payload: BlindpayWebhookPayload;
}

export interface BlindpayWebhookPayload {
  type?: string;
  data?: {
    id?: string;
    status?: string | BlindpayStatus;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verify a BlindPay (Svix) webhook signature in constant time. Throws on
 * any failure (missing headers, bad timestamp, no matching signature).
 */
export function verifySignature(input: VerifySignatureInput): void {
  const { body, headers, secret, toleranceSeconds = 300 } = input;

  if (!headers.id || !headers.timestamp || !headers.signature) {
    throw new Error(
      "BlindPay webhook missing required headers (svix-id, svix-timestamp, svix-signature).",
    );
  }

  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) {
    throw new Error("BlindPay webhook svix-timestamp is not a number.");
  }

  if (Number.isFinite(toleranceSeconds)) {
    const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > toleranceSeconds) {
      throw new Error(
        `BlindPay webhook timestamp ${ts} outside tolerance window of ${toleranceSeconds}s.`,
      );
    }
  }

  const key = decodeWebhookSecret(secret);
  const signedPayload = `${headers.id}.${headers.timestamp}.${body}`;
  const expected = createHmac("sha256", key).update(signedPayload).digest();

  const candidates = headers.signature
    .split(" ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => entry.startsWith("v1,"))
    .map((entry) => entry.slice(3));

  if (candidates.length === 0) {
    throw new Error("BlindPay webhook svix-signature has no v1 signatures.");
  }

  for (const candidate of candidates) {
    let provided: Buffer;
    try {
      provided = Buffer.from(candidate, "base64");
    } catch {
      continue;
    }
    if (provided.length !== expected.length) continue;
    if (timingSafeEqual(provided, expected)) {
      return;
    }
  }

  throw new Error("BlindPay webhook signature did not match any v1 candidate.");
}

/**
 * Decode an Svix-style webhook secret. BlindPay (Svix) issues secrets
 * prefixed with `whsec_`; the part after the prefix is base64-encoded HMAC
 * key material. Raw bytes are accepted as-is for callers who pre-decoded.
 */
function decodeWebhookSecret(secret: string | Uint8Array): Buffer {
  if (typeof secret !== "string") {
    return Buffer.from(secret);
  }
  const trimmed = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  return Buffer.from(trimmed, "base64");
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Translate a verified BlindPay webhook into a {@link CanonicalEvent}.
 *
 * Defensive against missing fields — webhook payload shapes evolve, and a
 * normalizer that throws on unknown keys would block deliveries unnecessarily.
 */
export function normalize(
  payload: BlindpayWebhookPayload,
  headers: BlindpayWebhookHeaders,
): CanonicalEvent {
  const type = typeof payload.type === "string" ? payload.type : "unknown";
  const data = (payload.data ?? {}) as {
    id?: string;
    status?: string;
  };
  const status = typeof data.status === "string" ? data.status : null;

  return {
    type,
    kind: classifyEventKind(type),
    messageId: headers.id,
    timestamp: Number(headers.timestamp) || 0,
    canonicalState: status ? mapBlindpayStatus(status) : null,
    resourceId: typeof data.id === "string" ? data.id : null,
    payload,
  };
}

function classifyEventKind(type: string): CanonicalEventKind {
  if (type.startsWith("payin")) return "payin";
  if (type.startsWith("payout")) return "payout";
  if (type.startsWith("transfer")) return "transfer";
  if (type.startsWith("wallet.inbound")) return "wallet.inbound";
  if (type.startsWith("receiver")) return "receiver";
  if (type.startsWith("bankAccount")) return "bankAccount";
  return "unknown";
}
