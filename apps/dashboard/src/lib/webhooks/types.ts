/**
 * Shared types for the dashboard webhook receiver framework (Phase 5A).
 *
 * Each provider's package owns the upstream-shape types and the verifier
 * + normalizer; the framework consumes a small contract via these
 * interfaces so the route-handler factory stays provider-agnostic.
 */

import type { TransactionState } from "@dynamic-demos/transactions";

/**
 * The provider-agnostic shape produced by a provider's `normalize`. The
 * framework consumes only these fields; provider-specific shapes live in
 * each provider's `webhooks.ts` and may include additional metadata for
 * downstream code paths.
 */
export interface CanonicalWebhookEvent {
  /** Provider-supplied unique event id. Combined with `provider` it's the dedup key. */
  providerEventId: string;
  /** Verbatim provider event type, used for logging + routing decisions. */
  eventType: string;
  /** Provider-claimed timestamp (when the upstream event happened). */
  occurredAt: Date;
  /** Untouched payload as the provider sent it. Replayed for audit. */
  rawPayload: unknown;
  /** Provider-agnostic normalized shape. Stored alongside `rawPayload`. */
  normalizedPayload: unknown;
  /** Provider-side resource id (e.g. payout id) when present in payload. */
  resourceId: string | null;
  /**
   * Local TransactionRecord id this event references, when the normalizer
   * resolved one from the payload. Null means "no local match" — the
   * receiver persists the event as `ignored` so it's still auditable.
   */
  transactionId: string | null;
  /** Optional demo instance id mirror for fast filtering when no transaction row exists. */
  demoInstanceId?: string | null;
  /** Optional brand id mirror for fast filtering when no transaction row exists. */
  brandId?: string | null;
  /**
   * Canonical state mapped from the event's payload, when the upstream
   * event represents a state change. Null for non-transaction events
   * (account.created, kyc.approved, etc.) — the receiver still persists
   * those for audit.
   */
  canonicalState: TransactionState | null;
}

/**
 * Logger surface the framework uses. Production uses `console.info` /
 * `console.error`; tests inject capturing loggers.
 */
export interface WebhookLogger {
  info: (line: string) => void;
  error: (line: string, err?: unknown) => void;
}
