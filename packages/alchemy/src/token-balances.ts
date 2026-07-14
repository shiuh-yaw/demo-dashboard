/**
 * Alchemy Token Balances API
 *
 * JSON-RPC method for fetching ERC-20 token balances for an address.
 * @see https://docs.alchemy.com/reference/alchemy-gettokenbalances
 */

import type {
  GetTokenBalancesParams,
  GetTokenBalancesResponse,
  AlchemyOptions,
} from "./types";

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: GetTokenBalancesResponse;
  error?: { code: number; message: string };
}

/**
 * Fetch ERC-20 token balances for an address.
 *
 * Balances come back as hex strings in the token's smallest unit;
 * callers convert with the token's decimals (see `formatTokenBalance`).
 */
export async function getTokenBalances(
  params: GetTokenBalancesParams,
  options: AlchemyOptions,
): Promise<GetTokenBalancesResponse> {
  const url = `https://${options.network}.g.alchemy.com/v2/${options.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getTokenBalances",
      params: [params.address, params.contractAddresses],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Alchemy request failed: ${response.status} ${response.statusText}`,
    );
  }

  const json: JsonRpcResponse = await response.json();

  if (json.error) {
    throw new Error(
      `Alchemy RPC error: ${json.error.message} (code ${json.error.code})`,
    );
  }

  return json.result ?? { address: params.address, tokenBalances: [] };
}

/**
 * Convert a hex token balance (smallest unit) to a human-readable number
 * using the token's decimals. Returns 0 for missing/errored balances.
 */
export function formatTokenBalance(
  tokenBalance: string | null | undefined,
  decimals: number,
): number {
  if (!tokenBalance) return 0;
  const raw = BigInt(tokenBalance);
  return Number(raw) / 10 ** decimals;
}
