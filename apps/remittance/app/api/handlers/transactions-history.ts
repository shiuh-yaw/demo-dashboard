/**
 * Transaction History Handler
 */

import {
  getAssetTransfers,
  ALCHEMY_NETWORKS,
  type AssetTransfer,
} from "@dynamic-demos/alchemy";
import { env } from "@/lib/env";
import { ValidationError } from "@/lib/errors";

interface TxItem {
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

const PAGE_SIZE = 25;

interface PageKeyPayload {
  sent?: string;
  received?: string;
}

function parsePageKey(pageKey: string | null): PageKeyPayload {
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

export async function handleGetTransactionHistory(params: {
  address: string;
  networkId: string;
  limit?: string;
  pageKey?: string | null;
}) {
  const { address, networkId, limit = "20", pageKey } = params;

  if (!address || !networkId) {
    throw new ValidationError("address and networkId are required");
  }

  const chainId = parseInt(networkId, 10);
  const network = ALCHEMY_NETWORKS[chainId];

  if (!network) {
    throw new ValidationError(`Unsupported network: ${networkId}`);
  }

  const { sent: sentPageKey, received: receivedPageKey } = parsePageKey(
    pageKey ?? null,
  );

  const options = { apiKey: env.ALCHEMY_API_KEY, network };
  const baseParams = {
    category: ["external" as const, "erc20" as const],
    withMetadata: true,
    excludeZeroValue: true,
    maxCount: `0x${PAGE_SIZE.toString(16)}`,
    order: "desc" as const,
  };

  const [sent, received] = await Promise.all([
    getAssetTransfers(
      {
        ...baseParams,
        fromAddress: address,
        ...(sentPageKey && { pageKey: sentPageKey }),
      },
      options,
    ),
    getAssetTransfers(
      {
        ...baseParams,
        toAddress: address,
        ...(receivedPageKey && { pageKey: receivedPageKey }),
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

  const limitNum = parseInt(limit, 10);
  const transactions: TxItem[] = merged.slice(0, limitNum).map(mapTransfer);

  const nextPageKey: PageKeyPayload = {};
  if (sent.pageKey) nextPageKey.sent = sent.pageKey;
  if (received.pageKey) nextPageKey.received = received.pageKey;
  const nextPageKeyStr =
    Object.keys(nextPageKey).length > 0 ? JSON.stringify(nextPageKey) : null;

  return { transactions, nextPageKey: nextPageKeyStr };
}
