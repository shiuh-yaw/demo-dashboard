/**
 * Fireblocks Client Factory
 *
 * Returns a real Fireblocks client when credentials are provided,
 * or a mock client when useMock: true. Throws when credentials
 * are missing and useMock is not set.
 */

import { FireblocksClient } from "./client";
import { resolveFireblocksConfig } from "./config";
import { MockFireblocksClient } from "./mock-client";
import type { FireblocksConfig, IFireblocksClient } from "./types";

export interface CreateFireblocksClientOptions extends Partial<FireblocksConfig> {
  /** If true, return MockFireblocksClient (no credentials needed) */
  useMock?: boolean;
}

export function createFireblocksClient(
  config?: CreateFireblocksClientOptions,
): IFireblocksClient {
  if (config?.useMock) return new MockFireblocksClient();

  try {
    const resolved = resolveFireblocksConfig(config);
    return new FireblocksClient(resolved);
  } catch {
    throw new Error(
      "Fireblocks API credentials required. Set FIREBLOCKS_API_KEY and FIREBLOCKS_API_SECRET, or pass useMock: true for local development.",
    );
  }
}
