/**
 * Fireblocks Client Singleton
 *
 * Server-side Fireblocks client for admin operations.
 * Uses requireReal in production to prevent accidental mock usage.
 */

import { createFireblocksClient, type IFireblocksClient } from "@dynamic-demos/fireblocks";

let _client: IFireblocksClient | null = null;

export function getFireblocksClient(): IFireblocksClient {
  if (!_client) {
    _client = createFireblocksClient({
      requireReal: process.env.NODE_ENV === "production",
    });
  }
  return _client;
}
