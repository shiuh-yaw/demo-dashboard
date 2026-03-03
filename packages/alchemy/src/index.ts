export { ALCHEMY_NETWORKS } from "./types";
export type {
  AssetTransferCategory,
  GetAssetTransfersParams,
  RawContract,
  TransferMetadata,
  AssetTransfer,
  GetAssetTransfersResponse,
  AlchemyOptions,
} from "./types";

import type {
  GetAssetTransfersParams,
  GetAssetTransfersResponse,
  AlchemyOptions,
} from "./types";

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: GetAssetTransfersResponse;
  error?: { code: number; message: string };
}

export async function getAssetTransfers(
  params: GetAssetTransfersParams,
  options: AlchemyOptions,
): Promise<GetAssetTransfersResponse> {
  const url = `https://${options.network}.g.alchemy.com/v2/${options.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [params],
    }),
  });

  if (!response.ok) {
    throw new Error(`Alchemy request failed: ${response.status} ${response.statusText}`);
  }

  const json: JsonRpcResponse = await response.json();

  if (json.error) {
    throw new Error(`Alchemy RPC error: ${json.error.message} (code ${json.error.code})`);
  }

  return json.result ?? { transfers: [] };
}
