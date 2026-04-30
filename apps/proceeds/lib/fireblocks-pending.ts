/**
 * Server-only helper that surfaces in-flight Fireblocks payouts for a
 * given wallet — the gap between "user clicked Pay out" and "Alchemy
 * indexed the on-chain transfer".
 *
 * Returned shape is intentionally lean and UI-agnostic; the reports
 * page adapts these into ledger rows in `OnChainActivityTab`.
 */

import { listOrders, type FireblocksOrder } from "./fireblocks";
import { chainFromAssetId } from "./fireblocks-network";

/**
 * Orders we treat as "pending" — anything that hasn't reached a
 * terminal state. Fireblocks' lifecycle uses both `CREATED` and
 * `SUBMITTED` for the moment-of-acceptance, then progresses through
 * payment / processing states.
 */
const PENDING_STATUSES = new Set([
  "CREATED",
  "SUBMITTED",
  "PROCESSING",
  "AWAITING_PAYMENT",
  "PENDING_USER_ACTION",
]);

const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "FILLED",
  "FAILED",
  "CANCELED",
  "REJECTED",
]);

export interface PendingPayoutRecord {
  /** Fireblocks order id — also used as the React row key. */
  id: string;
  status: string;
  /** USDC amount in human units (parsed from `baseAmount`). */
  amount: number;
  asset: string;
  /**
   * Chain id derived from the order's `quoteAssetId`. `null` when the
   * asset id doesn't match any chain we've mapped in `FIREBLOCKS_CONFIGS`
   * (e.g. a Fireblocks tenant configured a quote asset we don't know
   * about yet). The display label always renders something useful.
   */
  chainId: number | null;
  chainDisplay: string;
  /** ISO timestamp from Fireblocks. */
  createdAt: string;
  /** Recipient wallet address (lowercased on the way in). */
  destinationAddress: string;
  /** Internal reference, e.g. "proceeds-2025-01" — used to group by month. */
  monthRef: string | null;
  note: string | null;
}

function parseAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function parseAsset(quoteAssetId: string | undefined): string {
  if (!quoteAssetId) return "USDC";
  if (quoteAssetId.startsWith("USDC")) return "USDC";
  const [head] = quoteAssetId.split("_");
  return head ?? "USDC";
}

export interface PendingPayoutsResult {
  orders: PendingPayoutRecord[];
  /** Whether the result came from a real Fireblocks call (`live`) or
   *  a missing-credentials short-circuit (`mock`, returns []). */
  source: "live" | "mock";
}

/**
 * Fetches the current set of in-flight Fireblocks payouts targeted at
 * `walletAddress`. Returns `{ orders: [], source: "mock" }` when
 * credentials are unavailable so the caller can render a stable empty
 * state without special-casing the demo path.
 */
export async function fetchPendingPayouts(
  walletAddress: string | null | undefined,
): Promise<PendingPayoutsResult> {
  const wallet = walletAddress?.toLowerCase();
  if (!wallet) return { orders: [], source: "live" };

  let orders: FireblocksOrder[];
  try {
    orders = await listOrders(100);
  } catch (err) {
    console.error("[fetchPendingPayouts] listOrders failed:", err);
    return { orders: [], source: "mock" };
  }

  // No live data available (e.g. credentials missing) — treat as a
  // demo-mode empty list. We deliberately don't synthesise mock pending
  // orders here; the demo flow already shows a "Demo (simulated)"
  // badge in the payout modal, and conjuring fake pending rows on the
  // reports page would mislead anyone testing real Fireblocks.
  if (orders.length === 0) return { orders: [], source: "mock" };

  const filtered = orders.filter((o) => {
    const isForWallet =
      o.destination?.type === "ONE_TIME_ADDRESS" &&
      o.destination.address?.toLowerCase() === wallet;
    if (!isForWallet) return false;
    if (TERMINAL_STATUSES.has(o.status)) return false;
    return PENDING_STATUSES.has(o.status);
  });

  const records: PendingPayoutRecord[] = filtered.map((o) => {
    const chainInfo = chainFromAssetId(o.quoteAssetId);
    return {
      id: o.id,
      status: o.status,
      amount: parseAmount(o.baseAmount),
      asset: parseAsset(o.quoteAssetId),
      chainId: chainInfo.chainId,
      chainDisplay: chainInfo.networkDisplay,
      createdAt: o.createdAt,
      destinationAddress: o.destination?.address ?? wallet,
      monthRef: o.customerInternalReferenceId ?? null,
      note: o.note ?? null,
    };
  });

  // Most-recent first.
  records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { orders: records, source: "live" };
}
