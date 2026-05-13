/**
 * Magic-send — Dynamic `wallet.activity` webhook processor.
 *
 * The dashboard receives `wallet.activity` events from Dynamic. The
 * receiver framework in `lib/webhooks/handler-factory.ts` verifies the
 * signature, dedups, and persists the event row. THIS file owns the
 * magic-send-specific routing:
 *
 *   1. Decide whether the event is an incoming ERC-20 transfer TO a
 *      tracked embedded wallet (vs. KYC pings, outgoing transfers, etc.).
 *   2. Look up the Redis pending entry keyed by the recipient address.
 *   3. Validate that the inbound amount + token match the pending intent
 *      so an attacker can't fake-confirm an arbitrary intent by sending
 *      dust.
 *   4. Call `MagicSendIntentService.executeIntent(intentId)`.
 *
 * The receiver framework already enforces signature verification +
 * dedup, so this processor focuses on the business-level routing.
 *
 * Signature verification HMAC for Dynamic's webhooks is implemented in
 * `verifyDynamicWebhookSignature` below — exported separately so the
 * route file can plug it into the receiver framework directly.
 */

import * as crypto from "node:crypto";

import type { CanonicalWebhookEvent } from "@/lib/webhooks/types";

import type { MagicSendRedisClient } from "./intents";
import { pendingIntentKey } from "./intents";
import type { HexAddress, PendingIntent } from "./types";
import type { MagicSendIntentService } from "./intents";

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verify a Dynamic webhook signature. The expected scheme matches the
 * Dynamic dashboard's documented format:
 *
 *   x-dynamic-signature-256: sha256=<hex>
 *
 * The hex is HMAC-SHA256 of the *raw* request body. We require the
 * caller to pass `rawBody` because parsing+restringifying JSON changes
 * whitespace and breaks signature comparison.
 *
 * Uses `crypto.timingSafeEqual` to avoid timing-oracle attacks.
 */
export function verifyDynamicWebhookSignature({
  secret,
  signature,
  rawBody,
}: {
  secret: string;
  signature: string;
  rawBody: string;
}): boolean {
  if (!secret) return false;
  if (!signature) return false;
  const payloadSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const trusted = Buffer.from(`sha256=${payloadSignature}`, "ascii");
  const untrusted = Buffer.from(signature, "ascii");
  if (trusted.length !== untrusted.length) return false;
  try {
    return crypto.timingSafeEqual(trusted, untrusted);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Payload typing — Dynamic-specific
// ---------------------------------------------------------------------------

/**
 * Minimal subset of the Dynamic `wallet.activity` payload the magic-send
 * processor consults. Dynamic's full schema is richer; we narrow here so
 * a schema bump doesn't ripple through the codebase.
 *
 * Field names match Dynamic's documented camelCase conventions; if the
 * upstream changes, adjust here.
 */
export interface DynamicWalletActivityEvent {
  messageId: string;
  eventName: string; // "wallet.activity"
  timestamp: number | string;
  data: {
    /** Direction of the activity from the user's wallet POV. */
    direction?: "incoming" | "outgoing";
    /** Recipient address (lowercased, but we re-normalize defensively). */
    to?: string;
    /** Sender address. */
    from?: string;
    /** Token contract address. Null for native-asset transfers. */
    tokenAddress?: string | null;
    /** Amount in smallest token unit, decimal string. */
    amount?: string;
    /** Numeric chain id (Dynamic delivers as number). */
    chainId?: number;
    /** Transaction hash of the on-chain transfer. */
    txHash?: string;
    /** Optional activity type discriminator. */
    activityType?: string;
  };
}

/**
 * Map a Dynamic `wallet.activity` payload to the framework canonical
 * shape. The mapper doesn't resolve a local transaction here — the
 * magic-send processor does that downstream via Redis lookup.
 */
export function normalizeDynamicWalletActivity(args: {
  body: unknown;
  headers: Headers;
}): CanonicalWebhookEvent {
  const payload = args.body as Partial<DynamicWalletActivityEvent>;
  if (!payload || !payload.messageId || !payload.eventName) {
    throw new Error("Dynamic webhook payload missing messageId/eventName");
  }
  const occurred =
    typeof payload.timestamp === "number"
      ? new Date(payload.timestamp * 1000)
      : new Date(String(payload.timestamp));
  return {
    providerEventId: payload.messageId,
    eventType: payload.eventName,
    occurredAt: isNaN(occurred.getTime()) ? new Date() : occurred,
    rawPayload: args.body,
    normalizedPayload: payload,
    resourceId: payload.data?.txHash ?? null,
    transactionId: null,
    canonicalState: null,
  };
}

// ---------------------------------------------------------------------------
// Magic-send processor
// ---------------------------------------------------------------------------

export interface ProcessDynamicWebhookDeps {
  redis: MagicSendRedisClient;
  intents: MagicSendIntentService;
  logger?: {
    info: (line: string) => void;
    error: (line: string, err?: unknown) => void;
  };
}

export type ProcessDynamicWebhookOutcome =
  | { kind: "executed"; intentId: string }
  | { kind: "ignored"; reason: string }
  | { kind: "no-match"; recipient: string };

/**
 * Process a normalized Dynamic `wallet.activity` event. Returns an
 * outcome record so the caller can log + map to processingStatus
 * without leaking control flow.
 *
 * The function is safe to call multiple times for the same event —
 * the underlying `executeIntent` is idempotent.
 */
export async function processDynamicWalletActivityWebhook(
  event: DynamicWalletActivityEvent,
  deps: ProcessDynamicWebhookDeps,
): Promise<ProcessDynamicWebhookOutcome> {
  const log = deps.logger;

  if (event.eventName !== "wallet.activity") {
    return { kind: "ignored", reason: `event-type-${event.eventName}` };
  }

  const data = event.data;
  if (!data) {
    return { kind: "ignored", reason: "no-data" };
  }
  if (data.direction !== "incoming") {
    return { kind: "ignored", reason: `direction-${data.direction ?? "none"}` };
  }
  if (!data.to) {
    return { kind: "ignored", reason: "no-recipient" };
  }
  if (!data.tokenAddress) {
    // Native-asset transfer — magic-send only routes ERC-20 today.
    return { kind: "ignored", reason: "no-token" };
  }
  if (!data.amount) {
    return { kind: "ignored", reason: "no-amount" };
  }

  const recipient = data.to.toLowerCase() as HexAddress;
  const incomingToken = data.tokenAddress.toLowerCase() as HexAddress;

  // Look up the pending intent for this recipient.
  const raw = await deps.redis.get(pendingIntentKey(recipient));
  if (!raw) {
    return { kind: "no-match", recipient };
  }

  let pending: PendingIntent;
  try {
    pending = JSON.parse(raw) as PendingIntent;
  } catch (err) {
    log?.error(
      `[magic-send:webhook] malformed pending entry recipient=${recipient}`,
      err,
    );
    return { kind: "ignored", reason: "malformed-pending" };
  }

  // Anti-spoof: an attacker who learns a recipient address must NOT
  // be able to fake-trigger executeIntent by sending dust. Match
  // token + amount exactly.
  if (pending.expectedToken.toLowerCase() !== incomingToken) {
    log?.info(
      `[magic-send:webhook] token-mismatch recipient=${recipient} expected=${pending.expectedToken} got=${incomingToken}`,
    );
    return { kind: "ignored", reason: "token-mismatch" };
  }
  if (pending.expectedAmount !== data.amount) {
    log?.info(
      `[magic-send:webhook] amount-mismatch recipient=${recipient} expected=${pending.expectedAmount} got=${data.amount}`,
    );
    return { kind: "ignored", reason: "amount-mismatch" };
  }

  try {
    await deps.intents.executeIntent(pending.intentId, {
      webhookEventId: event.messageId,
    });
  } catch (err) {
    log?.error(
      `[magic-send:webhook] executeIntent failed intentId=${pending.intentId}`,
      err,
    );
    throw err;
  }

  return { kind: "executed", intentId: pending.intentId };
}
