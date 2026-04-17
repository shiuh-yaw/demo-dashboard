/**
 * Server-only transaction fetch.
 *
 * Consumed by the server-rendered `/transactions` page. Returns
 * live Fireblocks orders scoped to the user's connected wallet, or
 * wallet-scoped mock data when Fireblocks is unreachable / not
 * configured.
 */

import { listOrders } from "@/lib/api/fireblocks";
import { MOCK_TRANSACTIONS } from "@/lib/mock-data";

/** Normalised transaction shape returned to the client. */
export interface TransactionRecord {
  id: string;
  fireblocksId: string;
  visaDirectTxId: string;
  amount: string;
  asset: string;
  blockchain: string;
  status: string;
  recipientWallet: string;
  timestamp: string;
}

export interface TransactionsResult {
  transactions: TransactionRecord[];
  source: "live" | "mock";
}

function parseAsset(quoteAssetId: string): { asset: string; blockchain: string } {
  if (quoteAssetId.startsWith("USDC_ETH")) return { asset: "USDC", blockchain: "Ethereum" };
  if (quoteAssetId.startsWith("USDC_SOL")) return { asset: "USDC", blockchain: "Solana" };
  const [asset] = quoteAssetId.split("_");
  return { asset: asset ?? quoteAssetId, blockchain: "Unknown" };
}

function filterMockByWallet(wallet: string): TransactionRecord[] {
  return MOCK_TRANSACTIONS.filter(
    (t) => t.recipientWallet.toLowerCase() === wallet,
  ).map((t) => ({
    id: t.id,
    fireblocksId: t.fireblocksId,
    visaDirectTxId: t.visaDirectTxId,
    amount: String(t.amount),
    asset: t.asset,
    blockchain: t.blockchain,
    status: t.status,
    recipientWallet: t.recipientWallet,
    timestamp: t.timestamp,
  }));
}

/**
 * Fetches live Fireblocks orders filtered to those whose destination
 * is a ONE_TIME_ADDRESS matching `walletAddress`. Falls back to
 * wallet-scoped MOCK_TRANSACTIONS when Fireblocks is unreachable or
 * credentials are not configured.
 *
 * Returning `{ transactions: [], source: "live" }` for an empty
 * `walletAddress` matches the API route's contract — transactions are
 * always scoped to a connected stablecoin wallet; showing all orders
 * would be misleading.
 */
export async function fetchTransactionsForWallet(
  walletAddress: string | null | undefined,
): Promise<TransactionsResult> {
  const wallet = walletAddress?.toLowerCase();
  if (!wallet) {
    return { transactions: [], source: "live" };
  }

  try {
    const orders = await listOrders(100);

    if (orders.length === 0) {
      return { transactions: filterMockByWallet(wallet), source: "mock" };
    }

    const filtered = orders.filter(
      (o) =>
        o.destination?.type === "ONE_TIME_ADDRESS" &&
        o.destination.address?.toLowerCase() === wallet,
    );

    const records: TransactionRecord[] = filtered.map((o) => {
      const { asset, blockchain } = parseAsset(o.quoteAssetId);
      return {
        id: o.id,
        fireblocksId: o.id,
        visaDirectTxId: o.customerInternalReferenceId ?? o.id,
        amount: o.baseAmount,
        asset,
        blockchain,
        status: o.status,
        recipientWallet: o.destination?.address ?? "",
        timestamp: o.createdAt,
      };
    });

    return { transactions: records, source: "live" };
  } catch (err) {
    console.error("[fetchTransactionsForWallet]", err);
    return { transactions: filterMockByWallet(wallet), source: "mock" };
  }
}
