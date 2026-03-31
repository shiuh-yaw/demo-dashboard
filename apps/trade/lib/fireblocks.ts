/**
 * Fireblocks Client Singleton
 *
 * Server-side Fireblocks client for vault operations.
 * Uses mock in development when credentials are absent.
 */

import {
  createFireblocksClient,
  type IFireblocksClient,
} from "@dynamic-demos/fireblocks";

import { env } from "@/lib/env";

let _client: IFireblocksClient | null = null;

export function getFireblocksClient(): IFireblocksClient {
  if (!_client) {
    const hasCredentials = env.FIREBLOCKS_API_KEY && env.FIREBLOCKS_API_SECRET;
    _client = createFireblocksClient({
      useMock: env.NODE_ENV !== "production" && !hasCredentials,
    });
  }
  return _client;
}
