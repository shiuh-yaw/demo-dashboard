/**
 * QStash Client for Background Job Processing
 *
 * Used for reliable transaction status polling with retries and exponential backoff.
 */

import { Client, Receiver } from "@upstash/qstash";
import { env } from "@/env";

// QStash client instance
let qstashClient: Client | null = null;

/**
 * Get QStash client (lazy initialization)
 */
export function getQStash(): Client | null {
  if (!env.QSTASH_TOKEN) {
    console.warn("QStash not configured - QSTASH_TOKEN not set");
    return null;
  }

  if (!qstashClient) {
    qstashClient = new Client({
      token: env.QSTASH_TOKEN,
    });
  }

  return qstashClient;
}

/**
 * Backoff delays in seconds for retry logic
 */
export const BACKOFF_DELAYS = [5, 10, 30, 60, 120, 300]; // 5s, 10s, 30s, 1m, 2m, 5m

/**
 * Get the next delay based on retry count
 */
export function getBackoffDelay(retryCount: number): number {
  return BACKOFF_DELAYS[Math.min(retryCount, BACKOFF_DELAYS.length - 1)];
}

/**
 * Maximum number of retries before giving up
 */
export const MAX_RETRIES = 50;

/**
 * Worker endpoint path
 */
export const WORKER_ENDPOINT = "/api/internal/worker";

/**
 * Enqueue a transaction for status monitoring
 */
export async function enqueueTransactionMonitor(
  transactionId: string,
  txHash: string,
  retryCount: number = 0
): Promise<string | null> {
  const qstash = getQStash();
  if (!qstash) {
    console.warn("QStash not available - skipping job enqueue");
    return null;
  }

  const appUrl = env.APP_URL;
  if (!appUrl) {
    console.warn("APP_URL not set - skipping job enqueue");
    return null;
  }

  const delay = retryCount > 0 ? getBackoffDelay(retryCount) : 0;

  try {
    const result = await qstash.publishJSON({
      url: `${appUrl}${WORKER_ENDPOINT}`,
      body: {
        transactionId,
        txHash,
        retryCount,
      },
      delay: delay,
      retries: 3, // QStash internal retries for delivery
    });

    return result.messageId;
  } catch (error) {
    console.error("Failed to enqueue transaction monitor:", error);
    return null;
  }
}

/**
 * Verify QStash signature from incoming webhook
 */
export async function verifyQStashSignature(
  signature: string,
  body: string
): Promise<boolean> {
  const currentKey = env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentKey) {
    console.warn("QSTASH_CURRENT_SIGNING_KEY not set - skipping verification");
    return true; // Allow in development
  }

  const receiver = new Receiver({
    currentSigningKey: currentKey,
    nextSigningKey: nextKey || currentKey,
  });

  try {
    await receiver.verify({
      signature,
      body,
    });
    return true;
  } catch {
    return false;
  }
}
