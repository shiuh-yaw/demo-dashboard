/**
 * LI.FI webhook surface.
 *
 * LI.FI does not currently send webhooks for bridge / swap events — the
 * canonical pattern is to poll `/status` (see `client.ts#getStatus`). The
 * dashboard already does this from the QStash worker.
 *
 * This module is kept as a no-op placeholder so the package shape matches
 * the other Phase 1B providers (`webhooks.verifySignature`,
 * `webhooks.normalize`). When LI.FI ships webhook delivery, fill these in
 * with real signature verification + event normalisation.
 *
 * TODO(phase-5a): If LI.FI publishes a webhook product, replace these
 * stubs with real signature verification and a normaliser that emits
 * `CanonicalEvent` from `@dynamic-demos/transactions`.
 */

export interface LifiWebhookVerificationResult {
  valid: false;
  reason: "lifi-does-not-deliver-webhooks";
}

/**
 * LI.FI does not deliver webhooks. Calling this always returns `false`
 * with a stable reason code so callers can branch deliberately rather
 * than silently treat unverified payloads as authentic.
 */
export function verifySignature(
  _request: unknown,
): LifiWebhookVerificationResult {
  return { valid: false, reason: "lifi-does-not-deliver-webhooks" };
}

/**
 * LI.FI does not deliver webhooks; we have no upstream event schema to
 * normalise. Returning `null` keeps the signature symmetric with the
 * other providers without forcing callers to invent a synthetic event.
 */
export function normalize(_event: unknown): null {
  return null;
}
