/**
 * Magic-send — credit balance derivation.
 *
 * Credits are NOT a separate Postgres table. They're derived from the
 * `Transaction` history at query time:
 *
 *   debit  = confirmed magic-send transaction (user used a credit)
 *   credit = future explicit top-up flow (not implemented in this PR)
 *
 * The derivation is per-(user, token, chain). A user can have credits
 * across multiple chains; the response carries one balance row per
 * tuple.
 *
 * "Balance" here is a usage counter — not a value-in-USD. One unit
 * equals "one magic-send call this user was allowed to make."
 * Demo configs decide how many credits a user starts with; the
 * top-up flow lands later.
 *
 * For Phase 7 we ship the read-side derivation only. Top-up writes
 * will be a follow-up PR.
 */

import type {
  TransactionRecord,
  TransactionRecordService,
} from "@/lib/services/types";

import type { CreditBalance, HexAddress } from "./types";
import { MAGIC_SEND_KIND } from "./intents";

interface MagicSendPayload {
  userId?: string;
  token?: HexAddress;
  chainId?: number;
}

/**
 * Compute the credit balance the dashboard should show for `userId`.
 *
 * Implementation: pull every magic-send `Transaction` row, filter to
 * the user's, and net out by `(token, chainId)`. Each terminal
 * `confirmed` row counts as one debit; failures and cancellations are
 * not deducted. Pending rows in flight count as a soft debit so the
 * UI doesn't double-spend.
 *
 * Returns an EMPTY array when the user has never used a credit. The
 * caller decides what default balance to surface (typically driven by
 * the demo instance config).
 */
export async function getCreditsForUser(
  userId: string,
  deps: { transactionRecords: TransactionRecordService },
): Promise<CreditBalance[]> {
  if (!userId) return [];

  const rows = await deps.transactionRecords.list({
    kind: MAGIC_SEND_KIND,
  });

  // Bucket by (token, chainId). Debits stored as a number — magic-send
  // credit counts top out far below `Number.MAX_SAFE_INTEGER` even at
  // implausible volumes (one row per call, capped by demo allowance).
  // When the top-up flow lands we'll switch to BigInt and bump tsconfig
  // target accordingly.
  const buckets = new Map<
    string,
    { token: HexAddress; chainId: number; debits: number }
  >();
  for (const row of rows) {
    if (!isUserRow(row, userId)) continue;
    const payload = (row.payload ?? {}) as MagicSendPayload;
    if (!payload.token || !payload.chainId) continue;
    if (!isDebitState(row.state)) continue;
    const key = `${payload.token.toLowerCase()}:${payload.chainId}`;
    const existing = buckets.get(key) ?? {
      token: payload.token.toLowerCase() as HexAddress,
      chainId: payload.chainId,
      debits: 0,
    };
    existing.debits += 1;
    buckets.set(key, existing);
  }

  // The current Phase 7 surface returns the debit *count* as balance.
  // A future top-up PR will offset this against an explicit credit
  // ledger entry per (user, token, chain).
  return Array.from(buckets.values()).map((b) => ({
    userId,
    token: b.token,
    chainId: b.chainId,
    // Negate because debits reduce balance; the caller adds the demo's
    // baseline allowance on top.
    balance: (-b.debits).toString(),
  }));
}

function isUserRow(row: TransactionRecord, userId: string): boolean {
  const payload = row.payload as MagicSendPayload | null;
  return payload?.userId === userId;
}

/**
 * Which lifecycle states count as a debit. Anything in flight or
 * confirmed counts; explicit failure states do not. The caller can
 * extend this set when value-tracking lands (e.g. partial debits).
 */
function isDebitState(state: string): boolean {
  return (
    state === "submitted-transfer" ||
    state === "transfer-confirmed" ||
    state === "submitted-userop" ||
    state === "confirmed"
  );
}
