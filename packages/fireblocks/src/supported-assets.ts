/**
 * Fetch supported assets from Fireblocks API.
 * Use this to discover the correct asset ID for your workspace.
 */

import { Fireblocks } from "@fireblocks/ts-sdk";
import { resolveFireblocksConfig } from "./config";

export interface SupportedAsset {
  id: string;
  name?: string;
}

export async function getSupportedAssets(config?: {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
}): Promise<SupportedAsset[]> {
  const resolved = resolveFireblocksConfig(config);
  const sdk = new Fireblocks({
    apiKey: resolved.apiKey,
    secretKey: resolved.apiSecret,
    basePath: resolved.baseUrl,
  });

  const res = await sdk.blockchainsAssets.getSupportedAssets();
  const raw = res.data as
    | Array<{ id: string; name?: string }>
    | { assets?: Array<{ id: string; name?: string }> };

  return Array.isArray(raw) ? raw : (raw?.assets ?? []);
}
