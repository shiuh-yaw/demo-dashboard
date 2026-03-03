/**
 * Server-side transaction history fetch.
 * Used by History page for server-side data loading.
 */

import {
  getAssetTransfers,
  ALCHEMY_NETWORKS,
  type AssetTransfer,
} from "@dynamic-demos/alchemy";
import { env } from "@/lib/env";
import { BASE_SEPOLIA_CHAIN_ID } from "@/lib/constants";

export interface TxItem {
  hash: string;
  from: string;
  to: string;
  value: string;
  asset: string;
  category: string;
  timestamp: string;
  status: string;
}

function mapTransfer(transfer: AssetTransfer): TxItem {
  return {
    hash: transfer.hash,
    from: transfer.from,
    to: transfer.to,
    value: transfer.value?.toString() ?? "0",
    asset: transfer.asset ?? "ETH",
    category: transfer.category,
    timestamp: transfer.metadata?.blockTimestamp ?? "",
    status: "confirmed",
  };
}

/**
 * Fetch transaction history server-side for a wallet address.
 * Returns empty array if address is missing or fetch fails.
 */
export async function getServerTransactionHistory(
  walletAddress: string | null,
  networkId = BASE_SEPOLIA_CHAIN_ID,
  limit = 20,
): Promise<TxItem[]> {
  if (!walletAddress) return [];

  const network = ALCHEMY_NETWORKS[networkId];
  if (!network) return [];

  const options = { apiKey: env.ALCHEMY_API_KEY, network };
  const transferParams = {
    category: ["external" as const, "erc20" as const],
    withMetadata: true,
    excludeZeroValue: true,
    maxCount: `0x${limit.toString(16)}`,
    order: "desc" as const,
  };

  try {
    const [sent, received] = await Promise.all([
      getAssetTransfers(
        { ...transferParams, fromAddress: walletAddress },
        options,
      ),
      getAssetTransfers(
        { ...transferParams, toAddress: walletAddress },
        options,
      ),
    ]);

    const seen = new Set<string>();
    const merged: AssetTransfer[] = [];

    for (const tx of [...sent.transfers, ...received.transfers]) {
      if (!seen.has(tx.hash)) {
        seen.add(tx.hash);
        merged.push(tx);
      }
    }

    merged.sort((a, b) => {
      const blockA = parseInt(a.blockNum, 16);
      const blockB = parseInt(b.blockNum, 16);
      return blockB - blockA;
    });

    return merged.slice(0, limit).map(mapTransfer);
  } catch {
    return [];
  }
}
