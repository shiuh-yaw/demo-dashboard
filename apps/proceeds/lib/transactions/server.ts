/**
 * Server-side transaction history fetch, backed by Alchemy's
 * `alchemy_getAssetTransfers` JSON-RPC method.
 *
 * We keep the API key server-side — all browser requests flow through the
 * `/api/transactions` route, never directly to Alchemy.
 */

import {
  getAssetTransfers,
  ALCHEMY_NETWORKS,
  type AssetTransfer,
} from "@dynamic-demos/alchemy";
import { env } from "@/lib/env";
import { getUsdcAddress } from "@/lib/network-config";

export interface TxHistoryPage {
  transfers: AssetTransfer[];
  nextPageKey: string | null;
}

interface PageKeyPayload {
  sent?: string;
  received?: string;
}

const DEFAULT_PAGE_SIZE = 25;

function parsePageKey(pageKey: string | null | undefined): PageKeyPayload {
  if (!pageKey) return {};
  try {
    const parsed = JSON.parse(pageKey) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as PageKeyPayload)
      : {};
  } catch {
    return {};
  }
}

/**
 * Fetch the next page of on-chain transfers for `address` on `networkId`.
 * Issues two Alchemy calls in parallel — one for `fromAddress` (outbound)
 * and one for `toAddress` (inbound) — then merges + dedupes by hash.
 */
export async function fetchTransactionHistoryPage(params: {
  address: string;
  networkId: number;
  limit?: number;
  pageKey?: string | null;
}): Promise<TxHistoryPage> {
  const { address, networkId, limit = DEFAULT_PAGE_SIZE, pageKey } = params;

  const network = ALCHEMY_NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unsupported network: ${networkId}`);
  }

  const { sent: sentPageKey, received: receivedPageKey } = parsePageKey(pageKey);

  const usdcAddress = getUsdcAddress(networkId);
  const options = { apiKey: env.ALCHEMY_API_KEY, network };
  const baseParams = {
    // Only USDC transfers for this chain — filters out airdrop/dust tokens.
    category: ["erc20" as const],
    ...(usdcAddress ? { contractAddresses: [usdcAddress] } : {}),
    withMetadata: true,
    excludeZeroValue: true,
    maxCount: `0x${limit.toString(16)}`,
    order: "desc" as const,
  };

  const [sent, received] = await Promise.all([
    getAssetTransfers(
      {
        ...baseParams,
        fromAddress: address,
        ...(sentPageKey ? { pageKey: sentPageKey } : {}),
      },
      options,
    ),
    getAssetTransfers(
      {
        ...baseParams,
        toAddress: address,
        ...(receivedPageKey ? { pageKey: receivedPageKey } : {}),
      },
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

  const transfers = merged.slice(0, limit);

  const nextPageKey: PageKeyPayload = {};
  if (sent.pageKey) nextPageKey.sent = sent.pageKey;
  if (received.pageKey) nextPageKey.received = received.pageKey;

  return {
    transfers,
    nextPageKey:
      Object.keys(nextPageKey).length > 0 ? JSON.stringify(nextPageKey) : null,
  };
}
