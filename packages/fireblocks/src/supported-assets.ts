/**
 * Fetch supported assets from Fireblocks API.
 * Use this to discover the correct asset ID for your workspace.
 */
import { Fireblocks, BasePath } from "@fireblocks/ts-sdk";

export interface SupportedAsset {
  id: string;
  name?: string;
}

export async function getSupportedAssets(config?: {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
}): Promise<SupportedAsset[]> {
  const apiKey = config?.apiKey ?? process.env.FIREBLOCKS_API_KEY;
  const apiSecret =
    config?.apiSecret ??
    process.env.FIREBLOCKS_API_SECRET ??
    process.env.FIREBLOCKS_SECRET_KEY;
  const baseUrl =
    config?.baseUrl ??
    process.env.FIREBLOCKS_API_BASE_URL ??
    process.env.FIREBLOCKS_BASE_PATH ??
    BasePath.Sandbox;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Fireblocks credentials required (FIREBLOCKS_API_KEY, FIREBLOCKS_API_SECRET)",
    );
  }

  const normalizedSecret = (apiSecret as string).replace(/\\n/g, "\n");
  const sdk = new Fireblocks({
    apiKey,
    secretKey: normalizedSecret,
    basePath: baseUrl,
  });

  const res = await sdk.blockchainsAssets.getSupportedAssets();
  const raw = res.data as
    | Array<{ id: string; name?: string }>
    | { assets?: Array<{ id: string; name?: string }> };

  return Array.isArray(raw) ? raw : (raw?.assets ?? []);
}
