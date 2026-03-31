/**
 * Fireblocks client singleton for the deposit app (always real API — no mock).
 */

import {
  createFireblocksClient,
  type IFireblocksClient,
} from "@dynamic-demos/fireblocks";

import { env } from "@/lib/env";

let _client: IFireblocksClient | null = null;

export function getFireblocksClient(): IFireblocksClient {
  if (!_client) {
    _client = createFireblocksClient({
      apiKey: env.FIREBLOCKS_API_KEY,
      apiSecret: env.FIREBLOCKS_API_SECRET,
      ...(env.FIREBLOCKS_API_BASE_URL
        ? { baseUrl: env.FIREBLOCKS_API_BASE_URL }
        : {}),
    });
  }
  return _client;
}
