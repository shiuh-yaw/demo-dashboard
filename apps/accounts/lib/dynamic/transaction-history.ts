"use client";

/**
 * Paginated transaction history for one address on one network.
 *
 * Chain-agnostic: the same call serves every chain this demo registers, so
 * there is no per-chain branch here the way a send has.
 *
 * Returns an empty page rather than throwing when the client is absent or the
 * call fails. History is context, not the point of the screen - a wallet with
 * an unreachable indexer should still be sendable from.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-transaction-history
 */

import {
  getTransactionHistory as sdkGetTransactionHistory,
  type Chain,
  type GetTransactionHistoryParams,
  type GetTransactionHistoryResponse,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

const EMPTY: GetTransactionHistoryResponse = {
  transactions: [],
  nextOffset: undefined,
};

export async function getTransactionHistory(
  params: GetTransactionHistoryParams,
): Promise<GetTransactionHistoryResponse> {
  if (!getClient()) return EMPTY;
  try {
    return await sdkGetTransactionHistory(params);
  } catch {
    return EMPTY;
  }
}

export type {
  Chain,
  GetTransactionHistoryParams,
  GetTransactionHistoryResponse,
};
