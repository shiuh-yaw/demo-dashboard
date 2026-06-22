/**
 * SumSub webhook signature verification + event normalization.
 *
 * SumSub signs webhooks with HMAC-SHA256:
 *   digest = hex(hmac_sha256(webhook_secret, raw_body))
 *   Header: `x-payload-digest` or `x-payload-digest-alg: HMAC_SHA256_HEX`
 *
 * The webhook secret is configured in the SumSub dashboard under
 * Dev Space → Webhooks → Secret Key.
 *
 * Reference: https://docs.sumsub.com/docs/webhooks
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SumsubWebhookPayload } from "./types";

export const SUMSUB_DIGEST_HEADER = "x-payload-digest";

/**
 * Verify a SumSub webhook signature.
 *
 * @param rawBody The raw request body as string or Buffer.
 * @param digest  The value of the `x-payload-digest` header.
 * @param secret  The webhook secret from SumSub dashboard.
 */
export function verifySumsubSignature(
  rawBody: string | Buffer,
  digest: string,
  secret: string,
): boolean {
  if (!digest || !secret) return false;

  const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString();
  const expected = createHmac("sha256", secret).update(bodyStr).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  let providedBuf: Buffer;
  try {
    providedBuf = Buffer.from(digest, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Canonical event shape for downstream processing.
 */
export interface CanonicalEvent {
  id: string;
  type: string;
  resource: string;
  resource_id: string;
  state?: string;
  provider_status?: string;
  provider: "sumsub";
  occurred_at: string;
  raw: unknown;
}

/**
 * Map SumSub review status + answer to a canonical state string.
 */
function resolveCanonicalState(payload: SumsubWebhookPayload): string | undefined {
  const { type, reviewResult, reviewStatus } = payload;

  if (type === "applicantReviewed" && reviewResult?.reviewAnswer === "GREEN") {
    return "approved";
  }
  if (type === "applicantReviewed" && reviewResult?.reviewAnswer === "RED") {
    return "rejected";
  }
  if (type === "applicantPending") {
    return "pending";
  }
  if (type === "applicantOnHold") {
    return "on_hold";
  }
  if (type === "applicantCreated") {
    return "created";
  }
  if (type === "applicantReset") {
    return "reset";
  }
  if (reviewStatus === "pending") {
    return "pending";
  }
  if (reviewStatus === "onHold") {
    return "on_hold";
  }
  return reviewStatus;
}

/**
 * Normalize a SumSub webhook payload into a canonical event shape.
 */
export function normalizeSumsubEvent(
  payload: SumsubWebhookPayload,
): CanonicalEvent {
  const state = resolveCanonicalState(payload);

  return {
    id: payload.correlationId ?? payload.applicantId,
    type: `sumsub.${payload.type}`,
    resource: "applicant",
    resource_id: payload.applicantId,
    state,
    provider_status: payload.reviewStatus,
    provider: "sumsub",
    occurred_at: payload.createdAtMs
      ? new Date(Number(payload.createdAtMs)).toISOString()
      : new Date().toISOString(),
    raw: payload,
  };
}
