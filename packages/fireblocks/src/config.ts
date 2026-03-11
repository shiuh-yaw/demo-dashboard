/**
 * Fireblocks config resolution from env and options.
 */

import { BasePath } from "@fireblocks/ts-sdk";
import type { FireblocksConfig } from "./types";

export function resolveFireblocksConfig(
  config?: Partial<FireblocksConfig>,
): FireblocksConfig {
  const apiKey = config?.apiKey || process.env.FIREBLOCKS_API_KEY;
  const apiSecret = config?.apiSecret || process.env.FIREBLOCKS_API_SECRET;
  const baseUrl =
    config?.baseUrl || process.env.FIREBLOCKS_API_BASE_URL || BasePath.Sandbox;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Fireblocks credentials required (FIREBLOCKS_API_KEY, FIREBLOCKS_API_SECRET)",
    );
  }

  const normalizedSecret = (apiSecret as string).replace(/\\n/g, "\n");
  return { apiKey, apiSecret: normalizedSecret, baseUrl };
}
