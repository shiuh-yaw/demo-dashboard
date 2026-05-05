/**
 * AlfredPay webhook signature verification + canonical event normalization.
 *
 * Signature scheme follows the readme.io standard (Stripe-style):
 *
 *   header: `alfredpay-signature: t=<unix-seconds>,v1=<hex(hmac-sha256)>`
 *   signed payload: `${unixSeconds}.${rawRequestBody}`
 *
 * If alfredPay's documented format diverges, the inner verifier swaps cleanly
 * because the public `verifySignature(request, options)` boundary is stable.
 *
 * Verification is timing-safe (`crypto.timingSafeEqual`) and rejects on:
 * - missing or malformed signature header
 * - timestamp outside the configurable tolerance window (default 5 min)
 * - HMAC mismatch (wrong secret OR tampered body)
 *
 * @see DECISIONS.md D-011 — webhooks land at dashboard only; this package
 *      ships the verifier + normalizer that the dashboard's
 *      `/api/webhooks/alfredpay` route consumes (Phase 5A wires it up).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import type { AlfredpayStatus } from "./types";

/**
 * Raw alfredPay webhook envelope as documented at
 * https://alfredpay.readme.io. Field shapes are intentionally permissive —
 * alfredPay reserves the right to add fields, and the verifier never trusts
 * data it hasn't authenticated.
 */
export interface AlfredpayWebhookEvent {
  /** alfredPay event id — used for idempotency at the dashboard layer. */
  id: string;
  /** Dotted event name, e.g. `offramp.completed`. */
  type: string;
  /** Resource snapshot at the time of the event. */
  data: {
    id: string;
    status?: AlfredpayStatus | string;
    [key: string]: unknown;
  };
  /** Provider-supplied timestamp (ISO 8601). */
  createdAt?: string;
}

/**
 * Translated, canonical-shaped event the dashboard can persist + fan out.
 * The full canonical event type lives in `packages/transactions` (Phase 1E);
 * until that's merged we mirror just the fields we know we'll need.
 */
export interface AlfredpayCanonicalEvent {
  /** Dedupe key — `${provider}:${event.id}`. */
  dedupeKey: string;
  /** Stable provider tag the dashboard's webhook table indexes on. */
  provider: "alfredpay";
  /** Upstream event id (raw, for support correlation). */
  providerEventId: string;
  /** Upstream event type (raw, for routing). */
  providerEventType: string;
  /** alfredPay resource id this event is about. */
  resourceId: string;
  /** Upstream status, untouched. */
  upstreamStatus?: string;
  /** Original event for audit / replay. */
  raw: AlfredpayWebhookEvent;
}

export interface VerifyAlfredpayWebhookOptions {
  /**
   * Shared secret used to compute the HMAC. Required.
   * Sourced from the alfredPay dashboard webhook configuration; lives in
   * the dashboard's env (D-003 — only Dynamic + Fireblocks creds live in apps).
   */
  secret: string;
  /**
   * Optional clock-skew tolerance in seconds for the webhook timestamp.
   * Defaults to 5 minutes (300s).
   */
  toleranceSeconds?: number;
  /**
   * Override `Date.now()` for tests. Returns milliseconds since epoch.
   */
  now?: () => number;
}

const SIGNATURE_HEADER = "alfredpay-signature";
const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

interface ParsedSignatureHeader {
  timestamp: number;
  signatures: string[];
}

/**
 * Parses `t=<unix>,v1=<hex>[,v1=<hex>...]`. Returns null on malformed input.
 * Multiple `v1=` entries support key-rotation windows.
 */
function parseSignatureHeader(value: string): ParsedSignatureHeader | null {
  if (!value) return null;
  const parts = value.split(",").map((p) => p.trim());
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) return null;
    const key = part.slice(0, eq);
    const val = part.slice(eq + 1);
    if (!val) return null;
    if (key === "t") {
      const n = Number.parseInt(val, 10);
      if (!Number.isFinite(n) || n <= 0) return null;
      timestamp = n;
    } else if (key === "v1") {
      // Reject anything that isn't a non-empty hex string.
      if (!/^[0-9a-f]+$/i.test(val)) return null;
      signatures.push(val);
    }
  }
  if (timestamp === null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function timingSafeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies an incoming alfredPay webhook request.
 *
 * Returns `true` only when the signature header parses, the timestamp is
 * inside `toleranceSeconds`, and the HMAC matches a v1 signature.
 *
 * Throws only on misconfiguration (missing secret) — never on adversarial
 * input. That keeps the dashboard's `/api/webhooks/alfredpay` route able
 * to respond `200/401` cleanly without try/catch noise.
 */
export async function verifySignature(
  request: { body: string; headers: Headers },
  options: VerifyAlfredpayWebhookOptions,
): Promise<boolean> {
  if (!options || !options.secret) {
    throw new Error(
      "[@dynamic-demos/alfredpay] webhooks.verifySignature: secret is required",
    );
  }

  const header = request.headers.get(SIGNATURE_HEADER)?.trim();
  if (!header) return false;

  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;

  const toleranceSec = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const nowMs = options.now ? options.now() : Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  if (Math.abs(nowSec - parsed.timestamp) > toleranceSec) return false;

  const toSign = `${parsed.timestamp}.${request.body}`;
  const expectedHex = createHmac("sha256", options.secret)
    .update(toSign)
    .digest("hex");

  return parsed.signatures.some((sig) => timingSafeHexEqual(sig, expectedHex));
}

/**
 * Normalizes an alfredPay webhook envelope into the canonical event shape
 * the dashboard's webhook framework (Phase 5A) persists.
 *
 * Pure function — does **not** verify signatures. Always call `verifySignature`
 * first; the dashboard webhook handler enforces this ordering.
 */
export function normalize(event: AlfredpayWebhookEvent): AlfredpayCanonicalEvent {
  const upstreamStatus =
    typeof event.data?.status === "string" ? event.data.status : undefined;
  return {
    provider: "alfredpay",
    providerEventId: event.id,
    providerEventType: event.type,
    resourceId: event.data?.id,
    upstreamStatus,
    dedupeKey: `alfredpay:${event.id}`,
    raw: event,
  };
}
