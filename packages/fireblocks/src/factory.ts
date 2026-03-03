/**
 * Fireblocks Client Factory
 *
 * Returns a real Fireblocks client when API credentials are available,
 * or a mock client for demos without credentials.
 */

import { BasePath } from "@fireblocks/ts-sdk";
import { FireblocksClient } from "./client";
import { MockFireblocksClient } from "./mock-client";
import type { FireblocksConfig, IFireblocksClient } from "./types";

export interface CreateFireblocksClientOptions extends Partial<FireblocksConfig> {
  /** If true, throw an error when credentials are missing instead of falling back to mock */
  requireReal?: boolean;
}

export function createFireblocksClient(
  config?: CreateFireblocksClientOptions,
): IFireblocksClient {
  const apiKey = config?.apiKey || process.env.FIREBLOCKS_API_KEY;
  const apiSecret =
    config?.apiSecret ||
    process.env.FIREBLOCKS_API_SECRET ||
    process.env.FIREBLOCKS_SECRET_KEY;
  const baseUrl =
    config?.baseUrl ||
    process.env.FIREBLOCKS_API_BASE_URL ||
    process.env.FIREBLOCKS_BASE_PATH ||
    BasePath.Sandbox;

  if (apiKey && apiSecret) {
    // PEM keys from .env may contain literal "\n" instead of real newlines
    const normalizedSecret = apiSecret.replace(/\\n/g, "\n");
    return new FireblocksClient({
      apiKey,
      apiSecret: normalizedSecret,
      baseUrl,
    });
  }

  if (config?.requireReal) {
    throw new Error(
      "Fireblocks API credentials required but not found. Set FIREBLOCKS_API_KEY and FIREBLOCKS_API_SECRET environment variables.",
    );
  }

  console.warn(
    "[fireblocks] No API credentials found — using MockFireblocksClient. Set FIREBLOCKS_API_KEY and FIREBLOCKS_API_SECRET for real transactions.",
  );
  return new MockFireblocksClient();
}
